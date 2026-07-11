import httpx
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.database import get_db, Checklist, User
from backend.app.auth import get_current_user

router = APIRouter(prefix="/weather", tags=["Weather"])

# Mock weekly forecast data
MOCK_WEEK_FORECAST = [
    {"day": "Mon", "high": 28, "low": 24, "rain": 90},
    {"day": "Tue", "high": 27, "low": 24, "rain": 95},
    {"day": "Wed", "high": 29, "low": 25, "rain": 70},
    {"day": "Thu", "high": 30, "low": 26, "rain": 50},
    {"day": "Fri", "high": 29, "low": 25, "rain": 80},
    {"day": "Sat", "high": 28, "low": 24, "rain": 85},
    {"day": "Sun", "high": 27, "low": 24, "rain": 95},
]

# Mock hourly rainfall forecast
MOCK_RAINFALL_FORECAST = [
    {"hour": "12 PM", "mm": 12},
    {"hour": "1 PM", "mm": 18},
    {"hour": "2 PM", "mm": 24},
    {"hour": "3 PM", "mm": 35},
    {"hour": "4 PM", "mm": 42},
    {"hour": "5 PM", "mm": 28},
    {"hour": "6 PM", "mm": 15},
    {"hour": "7 PM", "mm": 8},
]

@router.get("/current")
async def get_current_weather(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user)
):
    # Default values
    temp = 27
    condition = "Heavy Rain"
    wind = 22
    pressure = 998
    visibility = 4.5
    rainfall_1h = 42
    flood_risk = 68
    city = "Mumbai"

    # Try calling OpenWeather if key is available
    if settings.OPENWEATHER_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                url = f"https://api.openweathermap.org/data/2.5/weather?q=Mumbai&appid={settings.OPENWEATHER_API_KEY}&units=metric"
                res = await client.get(url, timeout=5.0)
                if res.status_code == 200:
                    data = res.json()
                    temp = round(data["main"]["temp"])
                    condition = data["weather"][0]["main"]
                    wind = round(data["wind"]["speed"] * 3.6)  # m/s to km/h
                    pressure = data["main"]["pressure"]
                    visibility = round(data.get("visibility", 10000) / 1000)
                    rainfall_1h = data.get("rain", {}).get("1h", 0)
                    # Simple flood risk calculation based on 1h rain
                    if rainfall_1h > 30:
                        flood_risk = 85
                    elif rainfall_1h > 15:
                        flood_risk = 65
                    elif rainfall_1h > 5:
                        flood_risk = 35
                    else:
                        flood_risk = 12
        except Exception:
            pass  # Fall back to defaults on API failure

    # Calculate Safety Score: Starts at 90
    # Deductions:
    # - Rainfall (up to -35 points)
    # - Flood risk (up to -35 points)
    # Additions:
    # - Checklist completion percentage (up to +20 points)
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
async def get_weather_forecast():
    return {
        "week": MOCK_WEEK_FORECAST,
        "hourly_rain": MOCK_RAINFALL_FORECAST
    }
