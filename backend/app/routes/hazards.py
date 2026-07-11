import math
import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from backend.app.database import get_db, HazardReport, User
from backend.app.auth import get_current_user
from backend.app.config import settings

router = APIRouter(prefix="/hazards", tags=["Community Hazards"])

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
async def get_hazards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reports = db.query(HazardReport).all()
    
    # Filter by user proximity if logged in
    if current_user and current_user.latitude is not None and current_user.longitude is not None:
        filtered = []
        for r in reports:
            dist = haversine_distance(current_user.latitude, current_user.longitude, r.latitude, r.longitude)
            if dist <= 20.0:  # 20 km radius
                filtered.append(r)
        reports = filtered
        
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
    
    if image:
        os.makedirs("uploads", exist_ok=True)
        file_path = f"uploads/{datetime.utcnow().timestamp()}_{image.filename}"
        with open(file_path, "wb") as buffer:
            buffer.write(await image.read())
        image_url = f"/uploads/{os.path.basename(file_path)}"

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
