from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db, Alert

router = APIRouter(prefix="/alerts", tags=["Emergency Alerts"])

DEFAULT_ALERTS = [
    {
        "title": "Red Alert: Extreme Rain Predicted",
        "level": "high",
        "area": "Mumbai Metropolitan Area",
        "time": "Active · Next 6h"
    },
    {
        "title": "High Tide Warning (4.8m)",
        "level": "medium",
        "area": "Marine Drive, Gateway of India",
        "time": "Starts 2:30 PM"
    },
    {
        "title": "Waterlogging Alert",
        "level": "medium",
        "area": "Andheri Subway, Hindmata Junction",
        "time": "Ongoing"
    }
]

def populate_default_alerts(db: Session):
    existing = db.query(Alert).first()
    if not existing:
        for al in DEFAULT_ALERTS:
            db_al = Alert(
                title=al["title"],
                level=al["level"],
                area=al["area"],
                time=al["time"]
            )
            db.add(db_al)
        db.commit()

@router.get("")
async def get_alerts(db: Session = Depends(get_db)):
    populate_default_alerts(db)
    alerts = db.query(Alert).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "level": a.level,
            "area": a.area,
            "time": a.time
        } for a in alerts
    ]
