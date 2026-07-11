import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

def _get_database_url() -> str:
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return db_url
    try:
        # Test if we can write to the local directory
        test_file = "./.db_write_test"
        with open(test_file, "w") as f:
            f.write("")
        os.remove(test_file)
        return "sqlite:///./monsoon_copilot.db"
    except OSError:
        return "sqlite:////tmp/monsoon_copilot.db"

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
    DATABASE_URL: str = _get_database_url()
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

def _get_uploads_dir() -> str:
    try:
        os.makedirs("uploads", exist_ok=True)
        # Test write access
        test_file = "uploads/.write_test"
        with open(test_file, "w") as f:
            f.write("")
        os.remove(test_file)
        return "uploads"
    except OSError:
        os.makedirs("/tmp/uploads", exist_ok=True)
        return "/tmp/uploads"

settings = Settings()
# Add dynamically resolved UPLOADS_DIR to settings object
settings.__dict__["UPLOADS_DIR"] = _get_uploads_dir()
