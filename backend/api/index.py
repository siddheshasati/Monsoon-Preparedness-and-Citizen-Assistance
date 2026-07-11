import os
import sys
import types

# Get the directory of the backend (project root on Vercel)
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)

# Add it to the Python search path
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import the 'app' module
import app

# Dynamically alias the 'backend.app' package to 'app'
# This handles absolute imports like 'from backend.app.config import settings'
# in the deployed serverless environment where the 'backend' folder doesn't exist.
backend = types.ModuleType('backend')
sys.modules['backend'] = backend
sys.modules['backend.app'] = app

# Import and expose the FastAPI app for Vercel
from app.main import app
