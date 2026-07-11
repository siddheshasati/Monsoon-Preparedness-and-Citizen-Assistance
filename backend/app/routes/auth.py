import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from backend.app.database import get_db, User, OTPRecord
from backend.app.auth import create_access_token, get_current_user
from backend.app.utils.smtp import send_otp_email

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterSchema(BaseModel):
    email: EmailStr
    name: str
    role: str = "citizen"  # citizen, volunteer, ngo, admin
    location_name: str
    latitude: float
    longitude: float
    phone: str | None = None

class LoginSchema(BaseModel):
    email: EmailStr

class VerifyOTPSchema(BaseModel):
    email: EmailStr
    otp: str

# Helper to generate and save OTP
def generate_and_save_otp(email: str, db: Session) -> str:
    # 6-digit OTP
    otp = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Remove old OTPs for this email
    db.query(OTPRecord).filter(OTPRecord.email == email).delete()
    
    # Store new OTP
    db_otp = OTPRecord(email=email, otp=otp, expires_at=expires_at)
    db.add(db_otp)
    db.commit()
    return otp

@router.post("/register")
async def register(payload: RegisterSchema, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered. Please sign in instead."
        )
    
    # Verify role is valid
    valid_roles = ["citizen", "volunteer", "ngo", "admin"]
    if payload.role.lower() not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )
    
    # Create the user
    new_user = User(
        email=payload.email,
        name=payload.name,
        role=payload.role.lower(),
        phone=payload.phone,
        location_name=payload.location_name,
        latitude=payload.latitude,
        longitude=payload.longitude
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate and send OTP
    otp = generate_and_save_otp(payload.email, db)
    await send_otp_email(payload.email, otp)
    
    return {"message": "Registration successful. Verification OTP sent to email.", "email": payload.email}

@router.post("/login")
async def login(payload: LoginSchema, db: Session = Depends(get_db)):
    # Check if user exists
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email. Please register first."
        )
    
    # Generate and send OTP
    otp = generate_and_save_otp(payload.email, db)
    await send_otp_email(payload.email, otp)
    
    return {"message": "Verification OTP sent to email.", "email": payload.email}

@router.post("/verify-otp")
async def verify_otp(payload: VerifyOTPSchema, db: Session = Depends(get_db)):
    # Find OTP record
    otp_record = db.query(OTPRecord).filter(
        OTPRecord.email == payload.email,
        OTPRecord.otp == payload.otp
    ).first()
    
    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    # Check expiration
    if datetime.utcnow() > otp_record.expires_at:
        db.delete(otp_record)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired"
        )
    
    # Find user
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate Access Token
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    
    # Delete OTP record
    db.delete(otp_record)
    db.commit()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "phone": user.phone,
            "location_name": user.location_name,
            "latitude": user.latitude,
            "longitude": user.longitude
        }
    }

@router.get("/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "phone": current_user.phone,
        "location_name": current_user.location_name,
        "latitude": current_user.latitude,
        "longitude": current_user.longitude,
        "created_at": current_user.created_at
    }
