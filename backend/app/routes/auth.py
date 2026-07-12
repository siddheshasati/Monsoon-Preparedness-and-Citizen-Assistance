import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from backend.app.database import get_db, User, OTPRecord
from backend.app.auth import create_access_token, get_current_user, get_password_hash, verify_password
from backend.app.utils.smtp import send_otp_email
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterSchema(BaseModel):
    email: EmailStr
    name: str
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters long")
    role: str = "citizen"  # citizen, volunteer, ngo, admin
    location_name: str
    latitude: float | None = None
    longitude: float | None = None
    phone: str | None = None

class UserUpdateSchema(BaseModel):
    name: str | None = None
    phone: str | None = None
    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    role: str | None = None


class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class VerifyOTPSchema(BaseModel):
    email: EmailStr
    otp: str

class ResendOTPSchema(BaseModel):
    email: EmailStr
    action: str  # "register" or "login"

import json

# Helper to generate and save OTP
def generate_and_save_otp(email: str, db: Session, registration_data: str | None = None) -> str:
    # 6-digit OTP
    otp = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Remove old OTPs for this email
    db.query(OTPRecord).filter(OTPRecord.email == email).delete()
    
    # Store new OTP
    db_otp = OTPRecord(email=email, otp=otp, expires_at=expires_at, registration_data=registration_data)
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
    
    # Auto-geocode location if coordinates are missing
    latitude = payload.latitude
    longitude = payload.longitude
    if (latitude is None or longitude is None) and payload.location_name:
        from backend.app.utils.geocoding import geocode_address
        lat, lon = await geocode_address(payload.location_name)
        if lat is not None and lon is not None:
            latitude = lat
            longitude = lon

    # Hash the password to store it in registration data
    pwd_hash = get_password_hash(payload.password)

    # Serialize registration details as JSON string
    reg_data = json.dumps({
        "name": payload.name,
        "role": payload.role.lower(),
        "phone": payload.phone,
        "location_name": payload.location_name,
        "latitude": latitude,
        "longitude": longitude,
        "password_hash": pwd_hash
    })
    
    # Generate and send OTP, saving registration details
    otp = generate_and_save_otp(payload.email, db, registration_data=reg_data)
    email_sent = await send_otp_email(payload.email, otp)
    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification OTP email. Please check your email address and connection."
        )
    
    return {"message": "Registration successful. Verification OTP sent to email.", "email": payload.email}

@router.post("/login")
async def login(payload: LoginSchema, db: Session = Depends(get_db)):
    # Check if user exists
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    
    # Verify the password
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    
    # Generate Access Token directly (no OTP needed for sign in anymore)
    logger.info(f"User {user.email} logged in directly with password. No OTP/SMTP email sent.")
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    
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

@router.post("/resend-otp")
async def resend_otp(payload: ResendOTPSchema, db: Session = Depends(get_db)):
    # Check if there is an existing OTP record
    otp_record = db.query(OTPRecord).filter(OTPRecord.email == payload.email).first()
    
    # Check if user already exists
    user = db.query(User).filter(User.email == payload.email).first()
    if payload.action == "login":
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email. Please register first."
            )
    elif payload.action == "register":
        # Allow resending OTP even if user exists in the DB, resolving the registration resend bug.
        pass
            
    # Generate and send a new OTP, preserving the registration_data if it exists
    reg_data = otp_record.registration_data if otp_record else None
    
    otp = generate_and_save_otp(payload.email, db, registration_data=reg_data)
    email_sent = await send_otp_email(payload.email, otp)
    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification OTP. Please try again."
        )
        
    return {"message": "Verification OTP resent successfully.", "email": payload.email}

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
    
    user = db.query(User).filter(User.email == payload.email).first()
    
    # If registration_data is present, create the user
    if otp_record.registration_data:
        if not user:
            try:
                data = json.loads(otp_record.registration_data)
                user = User(
                    email=payload.email,
                    name=data["name"],
                    role=data["role"].lower(),
                    phone=data.get("phone"),
                    location_name=data.get("location_name"),
                    latitude=data.get("latitude"),
                    longitude=data.get("longitude"),
                    password_hash=data.get("password_hash")
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            except Exception as e:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create user account: {str(e)}"
                )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found. Please register first."
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

@router.get("/reverse-geocode")
async def api_reverse_geocode(latitude: float, longitude: float):
    from backend.app.utils.geocoding import reverse_geocode
    city = await reverse_geocode(latitude, longitude)
    if not city:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not resolve location name for these coordinates."
        )
    return {"location_name": city}

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

@router.put("/me")
async def update_users_me(
    payload: UserUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if payload.name is not None:
        current_user.name = payload.name
    if payload.phone is not None:
        current_user.phone = payload.phone
    if payload.location_name is not None:
        current_user.location_name = payload.location_name
        # Auto-geocode if new location name is given but no coordinates are provided
        if payload.latitude is None or payload.longitude is None:
            from backend.app.utils.geocoding import geocode_address
            lat, lon = await geocode_address(payload.location_name)
            if lat is not None and lon is not None:
                current_user.latitude = lat
                current_user.longitude = lon
    if payload.latitude is not None:
        current_user.latitude = payload.latitude
    if payload.longitude is not None:
        current_user.longitude = payload.longitude
    if payload.role is not None:
        valid_roles = ["citizen", "volunteer", "ngo", "admin"]
        if payload.role.lower() not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
            )
        current_user.role = payload.role.lower()
    
    db.commit()
    db.refresh(current_user)
    
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

