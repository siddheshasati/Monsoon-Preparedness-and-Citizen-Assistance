import math
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.database import get_db, Alert, User
from backend.app.auth import get_current_user

router = APIRouter(prefix="/alerts", tags=["Emergency Alerts"])

class AlertCreateSchema(BaseModel):
    title: str
    level: str  # low, medium, high
    area: str
    time: str
    latitude: float | None = None
    longitude: float | None = None

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@router.get("")
async def get_alerts(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user)
):
    alerts = db.query(Alert).all()
    
    # Filter by user location if user is logged in
    if current_user:
        filtered = []
        user_lat = current_user.latitude
        user_lon = current_user.longitude
        user_loc_name = (current_user.location_name or "").lower()
        
        for a in alerts:
            # If coordinates are available for both, use distance (50 km)
            if user_lat is not None and user_lon is not None and a.latitude is not None and a.longitude is not None:
                dist = haversine_distance(user_lat, user_lon, a.latitude, a.longitude)
                if dist <= 50.0:
                    filtered.append(a)
            # Fallback to substring matching in area name
            elif user_loc_name and (user_loc_name in a.area.lower() or a.area.lower() in user_loc_name):
                filtered.append(a)
            # If user has no coordinates and no name, or alert has no location metadata, return all
            elif not user_loc_name and user_lat is None:
                filtered.append(a)
        alerts = filtered
        
    return [
        {
            "id": a.id,
            "title": a.title,
            "level": a.level,
            "area": a.area,
            "time": a.time,
            "latitude": a.latitude,
            "longitude": a.longitude
        } for a in alerts
    ]

@router.post("")
async def create_alert(
    payload: AlertCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate role
    if current_user.role not in ["volunteer", "ngo", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only NGO members, volunteers, and government officials can broadcast emergency alerts."
        )
        
    alert = Alert(
        title=payload.title,
        level=payload.level,
        area=payload.area,
        time=payload.time,
        latitude=payload.latitude,
        longitude=payload.longitude
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert
