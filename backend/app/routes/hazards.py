from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from backend.app.database import get_db, HazardReport, User
from backend.app.auth import get_current_user
from backend.app.config import settings
from datetime import datetime
import os

router = APIRouter(prefix="/hazards", tags=["Community Hazards"])

DEFAULT_HAZARDS = [
    {
        "type": "Waterlogging",
        "severity": "high",
        "description": "Andheri subway has accumulated 3 feet of water. Avoid this route entirely.",
        "location_name": "Andheri Subway, Mumbai",
        "latitude": 19.1197,
        "longitude": 72.8464,
        "reports": 42,
        "status": "active"
    },
    {
        "type": "Fallen trees",
        "severity": "medium",
        "description": "Large tree has fallen blocking 2 lanes of S.V. Road near Bandra.",
        "location_name": "S.V. Road, Bandra West",
        "latitude": 19.0544,
        "longitude": 72.8402,
        "reports": 18,
        "status": "active"
    },
    {
        "type": "Electric hazards",
        "severity": "high",
        "description": "Sparking overhead cable hanging near Hindmata Cinema.",
        "location_name": "Hindmata Junction, Dadar",
        "latitude": 19.0189,
        "longitude": 72.8436,
        "reports": 35,
        "status": "active"
    },
    {
        "type": "Blocked roads",
        "severity": "medium",
        "description": "Drainage cleanup has left mud piles blocking local road access.",
        "location_name": "Sion Circle, Sion",
        "latitude": 19.0390,
        "longitude": 72.8619,
        "reports": 9,
        "status": "active"
    }
]

def populate_default_hazards(db: Session):
    existing = db.query(HazardReport).first()
    if not existing:
        for haz in DEFAULT_HAZARDS:
            db_haz = HazardReport(
                type=haz["type"],
                severity=haz["severity"],
                description=haz["description"],
                location_name=haz["location_name"],
                latitude=haz["latitude"],
                longitude=haz["longitude"],
                reports=haz["reports"],
                status=haz["status"]
            )
            db.add(db_haz)
        db.commit()

@router.get("")
async def get_hazards(db: Session = Depends(get_db)):
    populate_default_hazards(db)
    reports = db.query(HazardReport).all()
    return [
        {
            "id": r.id,
            "type": r.type,
            "severity": r.severity,
            "description": r.description,
            "location": r.location_name,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "image_url": r.image_url,
            "reports": r.reports,
            "status": r.status,
            "created_at": r.created_at
        } for r in reports
    ]

@router.post("/report")
async def report_hazard(
    type: str = Form(...),
    severity: str = Form(...),
    description: str = Form(None),
    location_name: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    image_url = None
    
    # In a full production app, you would upload to Cloudinary or local storage.
    # Here we mock store the image or just simulate it.
    if image:
        # Create uploads folder
        os.makedirs("uploads", exist_ok=True)
        file_path = f"uploads/{datetime.utcnow().timestamp()}_{image.filename}"
        with open(file_path, "wb") as buffer:
            buffer.write(await image.read())
        image_url = f"/uploads/{os.path.basename(file_path)}"
        
        # If Gemini API Key is available, verify the image
        if settings.GEMINI_API_KEY:
            try:
                # We can call Gemini API to parse the hazard severity
                # from google import genai
                # client = genai.Client(api_key=settings.GEMINI_API_KEY)
                # response = client.models.generate_content(...)
                pass
            except Exception:
                pass

    # Save to Database
    db_report = HazardReport(
        type=type,
        severity=severity.lower(),
        description=description,
        location_name=location_name,
        latitude=latitude,
        longitude=longitude,
        image_url=image_url,
        reports=1,
        status="active",
        created_by=current_user.name
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    return {
        "id": db_report.id,
        "type": db_report.type,
        "severity": db_report.severity,
        "description": db_report.description,
        "location": db_report.location_name,
        "latitude": db_report.latitude,
        "longitude": db_report.longitude,
        "image_url": db_report.image_url,
        "reports": db_report.reports,
        "status": db_report.status
    }

@router.post("/confirm/{report_id}")
async def confirm_hazard(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(HazardReport).filter(HazardReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hazard report not found"
        )
    
    report.reports += 1
    db.commit()
    db.refresh(report)
    return {"message": "Hazard report confirmed", "reports": report.reports}
