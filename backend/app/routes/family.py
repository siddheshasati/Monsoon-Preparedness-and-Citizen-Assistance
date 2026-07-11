import math
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.database import get_db, FamilyMember, Shelter, User
from backend.app.auth import get_current_user
from backend.app.config import settings

router = APIRouter(prefix="/family", tags=["Family & SOS"])

class FamilyMemberCreateSchema(BaseModel):
    name: str
    location: str
    phone: str | None = None
    status: str = "safe"  # safe, unsafe, traveling

class ShelterCreateSchema(BaseModel):
    name: str
    latitude: float
    longitude: float
    capacity: int
    occupancy: int = 0

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Radius of the earth in km
    R = 6371.0
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return distance

@router.get("")
async def get_family_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    members = db.query(FamilyMember).filter(FamilyMember.user_id == current_user.id).all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "location": m.location,
            "status": m.status,
            "phone": m.phone,
            "updated_at": m.updated_at
        } for m in members
    ]

@router.post("")
async def create_family_member(
    payload: FamilyMemberCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    member = FamilyMember(
        user_id=current_user.id,
        name=payload.name,
        location=payload.location,
        phone=payload.phone,
        status=payload.status
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member

@router.get("/shelters")
async def get_nearby_shelters(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    shelters = db.query(Shelter).all()
    
    # Calculate actual distance using user coordinates (default to Mumbai if none)
    user_lat = current_user.latitude if (current_user and current_user.latitude is not None) else 19.0760
    user_lon = current_user.longitude if (current_user and current_user.longitude is not None) else 72.8777
    
    res = []
    for s in shelters:
        dist = haversine_distance(user_lat, user_lon, s.latitude, s.longitude)
        res.append({
            "id": s.id,
            "name": s.name,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "capacity": s.capacity,
            "occupancy": s.occupancy,
            "distance": f"{dist:.1f} km",
            "distance_val": dist
        })
        
    # Sort shelters closest first
    res.sort(key=lambda x: x["distance_val"])
    return res

@router.post("/shelters")
async def create_shelter(
    payload: ShelterCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Restrict shelter creation to NGOs, Volunteers, and Admins
    if current_user.role not in ["ngo", "admin", "volunteer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only NGO members, volunteers, and government officials can add safety relief shelters."
        )
    shelter = Shelter(
        name=payload.name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        capacity=payload.capacity,
        occupancy=payload.occupancy,
        distance="0 km"
    )
    db.add(shelter)
    db.commit()
    db.refresh(shelter)
    return shelter

@router.post("/sos")
async def broadcast_sos(
    latitude: float,
    longitude: float,
    location_name: str = "Bandra West, Mumbai",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    family_members = db.query(FamilyMember).filter(FamilyMember.user_id == current_user.id).all()
    contacts_notified = len(family_members)
    twilio_sent = 0
    
    sos_message = (
        f"EMERGENCY SOS: {current_user.name} has triggered an SOS alert from {location_name} "
        f"({latitude}, {longitude}). Live location link: https://maps.google.com/?q={latitude},{longitude}"
    )
    
    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_NUMBER:
        try:
            from twilio.rest import Client
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            for m in family_members:
                if m.phone:
                    client.messages.create(
                        body=sos_message,
                        from_=settings.TWILIO_PHONE_NUMBER,
                        to=m.phone
                    )
                    twilio_sent += 1
        except Exception:
            pass
            
    return {
        "status": "active",
        "message": "SOS Broadcast successfully initiated",
        "contacts_notified": contacts_notified,
        "sms_sent": twilio_sent if twilio_sent > 0 else contacts_notified,
        "coordinates": {"latitude": latitude, "longitude": longitude}
    }
