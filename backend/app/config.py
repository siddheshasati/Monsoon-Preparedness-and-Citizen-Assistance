import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Monsoon Copilot API"
    
    # API Keys
    GROQ_API_KEY: str | None = os.getenv("GROQ_API_KEY")
    OPENWEATHER_API_KEY: str | None = os.getenv("OPENWEATHER_API_KEY")
    GOOGLE_MAPS_API_KEY: str | None = os.getenv("GOOGLE_MAPS_API_KEY")
    MAPBOX_API_KEY: str | None = os.getenv("MAPBOX_API_KEY")
    GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY")
    
    # Twilio
    TWILIO_ACCOUNT_SID: str | None = os.getenv("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN: str | None = os.getenv("TWILIO_AUTH_TOKEN")
    TWILIO_PHONE_NUMBER: str | None = os.getenv("TWILIO_PHONE_NUMBER")
    
    # Cloudinary
    CLOUDINARY_URL: str | None = os.getenv("CLOUDINARY_URL")
    
    # Databases
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./monsoon_copilot.db")
    REDIS_URL: str | None = os.getenv("REDIS_URL")
    
    # Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretjwtkeymonsooncopilot123!")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    
    # SMTP Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "mechautocutyeah@gmail.com")
    SMTP_PASSWORD: str | None = os.getenv("SMTP_PASSWORD")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "mechautocutyeah@gmail.com")

    class Config:
        case_sensitive = True

settings = Settings()
