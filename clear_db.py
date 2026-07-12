import sys
import os
from pathlib import Path
from sqlalchemy import create_engine, MetaData, text
from dotenv import load_dotenv

# Load environment variables from .env
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

def clear_database():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL environment variable is not set.")
        sys.exit(1)
        
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    # Mask database credentials for safe printing
    db_display = db_url.split('@')[-1] if '@' in db_url else db_url
    print(f"Connecting to database: {db_display}")
    
    try:
        engine = create_engine(db_url)
        metadata = MetaData()
        metadata.reflect(bind=engine)
        
        tables_to_clear = ["users", "checklists", "family_members", "otp_records", "hazard_reports", "alerts"]
        
        with engine.begin() as conn:
            if "postgresql" in db_url:
                conn.execute(text("SET CONSTRAINTS ALL DEFERRED;"))
                for table in tables_to_clear:
                    if table in metadata.tables:
                        # Use CASCADE to ensure clean truncate of dependent/foreign key relationships
                        conn.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))
                        print(f"Truncated table (PostgreSQL): {table}")
            else:
                conn.execute(text("PRAGMA foreign_keys = OFF;"))
                for table in tables_to_clear:
                    if table in metadata.tables:
                        conn.execute(text(f"DELETE FROM {table};"))
                        print(f"Cleared table (SQLite): {table}")
                conn.execute(text("PRAGMA foreign_keys = ON;"))
                
        print("Database cleanup completed successfully.")
    except Exception as e:
        print(f"Error occurred during database cleanup: {e}")
        sys.exit(1)

if __name__ == "__main__":
    clear_database()
