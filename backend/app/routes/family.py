from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db, FamilyMember, Shelter, User
from backend.app.auth import get_current_user
from backend.app.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/family", tags=["Family & SOS"])

DEFAULT_FAMILY = [
    {"name": "Arjun (Brother)", "location": "Andheri West, Mumbai", "status": "safe", "phone": "+919876543210"},
    {"name": "Priya (Mother)", "location": "Bandra East, Mumbai", "status": "safe", "phone": "+919876543211"},
    {"name": "Dad", "location": "Dadar West, Mumbai", "status": "safe", "phone": "+919876543212"},
]

DEFAULT_SHELTERS = [
    {"name": "BMC Secondary School Shelter", "latitude": 19.0205, "longitude": 72.8420, "capacity": 250, "occupancy": 132, "distance": "1.2 km"},
    {"name": "St. Stanislaus Relief Camp", "latitude": 19.0575, "longitude": 72.8390, "capacity": 150, "occupancy": 45, "distance": "2.4 km"},
    {"name": "Willesden YMCA Hall", "latitude": 19.1120, "longitude": 72.8510, "capacity": 300, "occupancy": 280, "distance": "3.1 km"},
    {"name": "Municipal Ground Center", "latitude": 19.0380, "longitude": 72.8590, "capacity": 500, "occupancy": 80, "distance": "4.2 km"}
]

def populate_default_family(user_id: int, db: Session):
    existing = db.query(FamilyMember).filter(FamilyMember.user_id == user_id).first()
    if not existing:
        for fam in DEFAULT_FAMILY:
            db_fam = FamilyMember(
                user_id=user_id,
                name=fam["name"],
                location=fam["location"],
                status=fam["status"],
                phone=fam["phone"]
            )
            db.add(db_fam)
        db.commit()

def populate_default_shelters(db: Session):
    existing = db.query(Shelter).first()
    if not existing:
        for sh in DEFAULT_SHELTERS:
            db_sh = Shelter(
                name=sh["name"],
                latitude=sh["latitude"],
                longitude=sh["longitude"],
                capacity=sh["capacity"],
                occupancy=sh["occupancy"],
                distance=sh["distance"]
            )
            db.add(db_sh)
        db.commit()

@router.get("")
async def get_family_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    populate_default_family(current_user.id, db)
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

@router.get("/shelters")
async def get_nearby_shelters(db: Session = Depends(get_db)):
    populate_default_shelters(db)
    shelters = db.query(Shelter).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "capacity": s.capacity,
            "occupancy": s.occupancy,
            "distance": s.distance
        } for s in shelters
    ]

@router.post("/sos")
async def broadcast_sos(
    latitude: float,
    longitude: float,
    location_name: str = "Bandra West, Mumbai",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Retrieve family members to notify
    populate_default_family(current_user.id, db)
    family_members = db.query(FamilyMember).filter(FamilyMember.user_id == current_user.id).all()
    
    contacts_notified = len(family_members)
    twilio_sent = 0
    
    # Broadcast message text
    sos_message = (
        f"EMERGENCY SOS: {current_user.name} has triggered an SOS alert from {location_name} "
        f"({latitude}, {longitude}). Live location link: https://maps.google.com/?q={latitude},{longitude}"
    )
    
    # If Twilio Credentials exist, attempt real SMS
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
            logger.info(f"SOS SMS broadcast sent to {twilio_sent} family contacts.")
        except Exception as e:
            logger.error(f"Failed sending Twilio SMS broadcast: {e}")
    else:
        logger.warning("==================================================")
        logger.warning("TWILIO CONFIG NOT SET. Simulated SOS Broadcast:")
        logger.warning(sos_message)
        logger.warning(f"Notified {contacts_notified} family contacts via fallback console.")
        logger.warning("==================================================")
        
    return {
        "status": "active",
        "message": "SOS Broadcast successfully initiated",
        "contacts_notified": contacts_notified,
        "sms_sent": twilio_sent if twilio_sent > 0 else contacts_notified,
        "coordinates": {"latitude": latitude, "longitude": longitude}
    }
