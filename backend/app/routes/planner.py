import json
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.database import get_db, Checklist, User
from backend.app.auth import get_current_user
from backend.app.config import settings

router = APIRouter(prefix="/checklist", tags=["Preparedness Planner"])

class GeneratePlannerSchema(BaseModel):
    location: str
    household_size: int
    has_elderly: bool
    has_children: bool
    has_pets: bool

DEFAULT_CHECKLIST = [
    {"item": "Assemble standard 3-day emergency kit (first-aid, dry food, 3L water/person)", "category": "Kit"},
    {"item": "Charge all power banks, flashlights, and emergency lights", "category": "Kit"},
    {"item": "Secure waterproof pouch for legal documents, passports, and IDs", "category": "Kit"},
    {"item": "Store 3-day supply of personal prescription medications", "category": "Kit"},
    {"item": "Create a family communication plan with emergency contact numbers", "category": "Family"},
    {"item": "Ensure children know emergency contact details and safe meeting points", "category": "Family"},
    {"item": "Inspect house drainage, clear blockages, and check roof for leaks", "category": "Home"},
    {"item": "Identify elevated storage locations for ground-level electronics", "category": "Home"},
]

def populate_default_checklist(user_id: int, db: Session):
    # Check if user already has items
    existing = db.query(Checklist).filter(Checklist.user_id == user_id).first()
    if not existing:
        for item in DEFAULT_CHECKLIST:
            db_item = Checklist(
                user_id=user_id,
                item=item["item"],
                category=item["category"],
                done=False
            )
            db.add(db_item)
        db.commit()

@router.get("")
async def get_checklist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    populate_default_checklist(current_user.id, db)
    items = db.query(Checklist).filter(Checklist.user_id == current_user.id).all()
    return [
        {
            "id": item.id,
            "item": item.item,
            "category": item.category,
            "done": item.done,
            "created_at": item.created_at
        } for item in items
    ]

@router.post("/toggle/{item_id}")
async def toggle_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(Checklist).filter(
        Checklist.id == item_id,
        Checklist.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist item not found"
        )
    
    item.done = not item.done
    db.commit()
    db.refresh(item)
    return {"message": "Item toggled successfully", "item": {"id": item.id, "done": item.done}}

@router.post("/generate")
async def generate_checklist(
    payload: GeneratePlannerSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # If Groq Key is available, use LangChain to generate personalized items
    generated_items = []
    
    if settings.GROQ_API_KEY:
        try:
            from langchain_groq import ChatGroq
            from langchain_core.prompts import ChatPromptTemplate
            
            llm = ChatGroq(
                temperature=0.3,
                groq_api_key=settings.GROQ_API_KEY,
                model_name="llama-3.3-70b-versatile"
            )
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an expert disaster preparedness consultant specializing in monsoon safety.
Your job is to generate a highly personalized, practical, and action-oriented preparedness checklist for a household.
Respond ONLY with a valid JSON array of objects. Each object must have keys "item" (string) and "category" (string, must be either "Kit", "Family", or "Home").
Do not include any introductory or concluding text, markdown code blocks, or formatting other than the JSON itself.
Example response format:
[
  {{"item": "Secure ground floor doors with sandbags", "category": "Home"}},
  {{"item": "Stock infant formula and pediatric medicines", "category": "Kit"}}
]
"""),
                ("user", """Generate a checklist of exactly 8 items based on:
- Location: {location}
- Household Size: {household_size} members
- Has Elderly: {has_elderly}
- Has Children: {has_children}
- Has Pets: {has_pets}
Keep recommendations specific to monsoons, rainfall, flooding, and waterborne diseases.""")
            ])
            
            chain = prompt | llm
            res = chain.invoke({
                "location": payload.location,
                "household_size": payload.household_size,
                "has_elderly": str(payload.has_elderly),
                "has_children": str(payload.has_children),
                "has_pets": str(payload.has_pets),
            })
            
            # Clean response text in case markdown quotes are present
            raw_text = res.content.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()
            
            generated_items = json.loads(raw_text)
        except Exception as e:
            # Fallback if AI call fails
            generated_items = []

    # Dynamic fallback generation if Groq is not set up or failed
    if not generated_items:
        generated_items = [
            {"item": f"Ensure a clean drinking water supply of at least {payload.household_size * 9}L total for the household", "category": "Kit"},
            {"item": "Assemble essential medicine kit, including water-purification tablets", "category": "Kit"},
            {"item": "Inspect rooftop drainage and clean street sewers near your home in " + payload.location, "category": "Home"},
            {"item": "Charge primary power banks, backup batteries and keep emergency phone active", "category": "Kit"},
            {"item": "Identify the nearest official municipal shelter and map a safe route", "category": "Home"},
        ]
        
        if payload.has_elderly:
            generated_items.append({"item": "Prepare prescription medication and coordinate mobility aids for elderly members", "category": "Family"})
        else:
            generated_items.append({"item": "Share emergency communication card copies with all family members", "category": "Family"})
            
        if payload.has_children:
            generated_items.append({"item": "Keep ORS packets, child-safe rain boots, and basic toys/snacks in your kit", "category": "Kit"})
        else:
            generated_items.append({"item": "Store waterproof covers for valuables and primary laptops", "category": "Home"})
            
        if payload.has_pets:
            generated_items.append({"item": "Stock pet food, pet medication, and secure a leash/carrier bag for evacuation", "category": "Family"})
        else:
            generated_items.append({"item": "Save emergency local helpline numbers on speed dial", "category": "Family"})

    # Update checklist in database
    # Clear existing checklist
    db.query(Checklist).filter(Checklist.user_id == current_user.id).delete()
    
    # Save newly generated items
    for item in generated_items:
        db_item = Checklist(
            user_id=current_user.id,
            item=item.get("item", "Emergency prepared item"),
            category=item.get("category", "Kit"),
            done=False
        )
        db.add(db_item)
    
    db.commit()
    
    # Fetch and return items
    items = db.query(Checklist).filter(Checklist.user_id == current_user.id).all()
    return [
        {
            "id": item.id,
            "item": item.item,
            "category": item.category,
            "done": item.done
        } for item in items
    ]
