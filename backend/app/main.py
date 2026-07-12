import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.routes import auth, weather, planner, hazards, chat, family, alerts

# Ensure uploads directory exists
os.makedirs(settings.UPLOADS_DIR, exist_ok=True)

# Auto-migrate/create SQLite/PostgreSQL schemas on startup
Base.metadata.create_all(bind=engine)

# Migration helper: Check if registration_data column exists in otp_records and add if missing
from sqlalchemy import inspect, text
inspector = inspect(engine)
try:
    columns = [col['name'] for col in inspector.get_columns('otp_records')]
    if 'registration_data' not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE otp_records ADD COLUMN registration_data TEXT"))
        print("Successfully added registration_data column to otp_records table.")
except Exception as e:
    print(f"Migration check error for otp_records: {e}")

try:
    columns = [col['name'] for col in inspector.get_columns('users')]
    if 'password_hash' not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN password_hash TEXT"))
        print("Successfully added password_hash column to users table.")
except Exception as e:
    print(f"Migration check error for users: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API services for the AI Monsoon Copilot platform",
    version="1.0.0"
)

# Configure CORS for React integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits all origins for easy development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Statically serve hazard images
app.mount("/uploads", StaticFiles(directory=settings.UPLOADS_DIR), name="uploads")

# Mount API Routers under /api
app.include_router(auth.router, prefix="/api")
app.include_router(weather.router, prefix="/api")
app.include_router(planner.router, prefix="/api")
app.include_router(hazards.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(family.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "message": "Welcome to AI Monsoon Copilot API. Head to /docs for Swagger documentation."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
