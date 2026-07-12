import httpx
import hashlib
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.database import get_db, Checklist, User
from backend.app.auth import get_current_user

router = APIRouter(prefix="/weather", tags=["Weather"])

def generate_location_weather(latitude: float, longitude: float, location_name: str):
    # Hash coordinates and location name for deterministic weather simulation
    seed = f"{latitude:.2f}_{longitude:.2f}_{location_name}"
    
    def get_val(sub_seed: str, min_v: float, max_v: float) -> float:
        h = hashlib.md5((seed + sub_seed).encode()).hexdigest()
        val = int(h, 16) / (2**128 - 1)
        return min_v + val * (max_v - min_v)
        
    temp = round(get_val("temp", 22, 33))
    
    conditions = ["Heavy Rain", "Moderate Rain", "Thunderstorm", "Light Drizzle", "Cloudy"]
    cond_idx = int(get_val("cond", 0, len(conditions)))
    condition = conditions[cond_idx]
    
    wind = round(get_val("wind", 8, 38))
    pressure = round(get_val("pressure", 985, 1012))
    visibility = round(get_val("vis", 1.5, 9.5), 1)
    
    if condition == "Heavy Rain":
        rainfall_1h = round(get_val("rain_heavy", 28, 55))
    elif condition == "Thunderstorm":
        rainfall_1h = round(get_val("rain_ts", 35, 60))
    elif condition == "Moderate Rain":
        rainfall_1h = round(get_val("rain_mod", 10, 25))
    elif condition == "Light Drizzle":
        rainfall_1h = round(get_val("rain_driz", 1, 8))
    else:
        rainfall_1h = 0
        
    if rainfall_1h > 35:
        flood_risk = round(get_val("flood_high", 75, 95))
    elif rainfall_1h > 15:
        flood_risk = round(get_val("flood_med", 45, 74))
    elif rainfall_1h > 0:
        flood_risk = round(get_val("flood_low", 15, 44))
    else:
        flood_risk = round(get_val("flood_none", 2, 12))
        
    return {
        "temp": temp,
        "condition": condition,
        "wind": wind,
        "pressure": pressure,
        "visibility": visibility,
        "rainfall": rainfall_1h,
        "flood_risk": flood_risk
    }

def generate_forecasts(latitude: float, longitude: float, location_name: str):
    seed = f"{latitude:.2f}_{longitude:.2f}_{location_name}"
    
    def get_val(sub_seed: str, min_v: float, max_v: float) -> float:
        h = hashlib.md5((seed + sub_seed).encode()).hexdigest()
        val = int(h, 16) / (2**128 - 1)
        return min_v + val * (max_v - min_v)
        
    week_days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    week_forecast = []
    for day in week_days:
        high = round(get_val(f"high_{day}", 26, 32))
        low = round(get_val(f"low_{day}", 22, 25))
        rain_prob = round(get_val(f"prob_{day}", 30, 98))
        week_forecast.append({
            "day": day,
            "high": high,
            "low": low,
            "rain": rain_prob
        })
        
    hours = ["Now", "+1h", "+2h", "+3h", "+4h", "+5h", "+6h", "+7h"]
    hourly_rain = []
    for idx, hr in enumerate(hours):
        mm = round(get_val(f"hr_mm_{idx}", 0, 45))
        hourly_rain.append({
            "hour": hr,
            "mm": mm
        })
        
    return {
        "week": week_forecast,
        "hourly_rain": hourly_rain
    }

@router.get("/current")
async def get_current_weather(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user)
):
    lat = 0.0
    lon = 0.0
    city = "Unknown Location"

    if current_user:
        if current_user.latitude is not None and current_user.longitude is not None:
            lat = current_user.latitude
            lon = current_user.longitude
        if current_user.location_name:
            city = current_user.location_name

    # Default generated values
    gen_data = generate_location_weather(lat, lon, city)
    temp = gen_data["temp"]
    condition = gen_data["condition"]
    wind = gen_data["wind"]
    pressure = gen_data["pressure"]
    visibility = gen_data["visibility"]
    rainfall_1h = gen_data["rainfall"]
    flood_risk = gen_data["flood_risk"]

    # Try calling OpenWeather if key is available
    if settings.OPENWEATHER_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={settings.OPENWEATHER_API_KEY}&units=metric"
                res = await client.get(url, timeout=5.0)
                if res.status_code == 200:
                    data = res.json()
                    temp = round(data["main"]["temp"])
                    condition = data["weather"][0]["main"]
                    wind = round(data["wind"]["speed"] * 3.6)  # m/s to km/h
                    pressure = data["main"]["pressure"]
                    visibility = round(data.get("visibility", 10000) / 1000)
                    rainfall_1h = data.get("rain", {}).get("1h", 0)
                    # Safety calculation
                    if rainfall_1h > 30:
                        flood_risk = 85
                    elif rainfall_1h > 15:
                        flood_risk = 65
                    elif rainfall_1h > 5:
                        flood_risk = 35
                    else:
                        flood_risk = 12
        except Exception:
            pass  # Fall back to generated defaults

    # Calculate Safety Score: Starts at 90
    base_score = 90
    rain_penalty = min(rainfall_1h * 0.8, 35)
    flood_penalty = (flood_risk / 100.0) * 35
    safety_score = max(int(base_score - rain_penalty - flood_penalty), 10)
    
    # Checklist bonus
    checklist_bonus = 0
    checklist_info = {"done": 0, "total": 0}
    if current_user:
        items = db.query(Checklist).filter(Checklist.user_id == current_user.id).all()
        if items:
            total = len(items)
            done = len([i for i in items if i.done])
            pct = done / total if total > 0 else 0
            checklist_bonus = int(pct * 20)
            safety_score = min(safety_score + checklist_bonus, 100)
            checklist_info = {"done": done, "total": total}

    return {
        "city": city,
        "temp": temp,
        "condition": condition,
        "wind": wind,
        "pressure": pressure,
        "visibility": visibility,
        "rainfall": rainfall_1h,
        "flood_risk": flood_risk,
        "safety_score": safety_score,
        "checklist_bonus": checklist_bonus,
        "checklist_info": checklist_info,
        "updatedAt": datetime.utcnow().isoformat()
    }

@router.get("/forecast")
async def get_weather_forecast(current_user: User | None = Depends(get_current_user)):
    lat = 0.0
    lon = 0.0
    city = "Unknown Location"

    if current_user:
        if current_user.latitude is not None and current_user.longitude is not None:
            lat = current_user.latitude
            lon = current_user.longitude
        if current_user.location_name:
            city = current_user.location_name
        
    forecasts = generate_forecasts(lat, lon, city)
    return forecasts
