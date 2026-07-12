import httpx
import logging
from backend.app.config import settings

logger = logging.getLogger(__name__)

async def geocode_address(location_name: str) -> tuple[float | None, float | None]:
    """
    Geocodes a location name to (latitude, longitude).
    Tries Nominatim first, and if that fails, falls back to OpenWeatherMap Geocoding API if key is present.
    """
    if not location_name or not location_name.strip():
        return None, None

    location_name = location_name.strip()
    
    # 1. Try Nominatim (OpenStreetMap)
    try:
        async with httpx.AsyncClient() as client:
            headers = {"User-Agent": "MonsoonCopilot/1.0 (monsoon-preparedness-citizen-assistance)"}
            url = "https://nominatim.openstreetmap.org/search"
            response = await client.get(
                url,
                params={"q": location_name, "format": "json", "limit": 1},
                headers=headers,
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    lat = float(data[0]["lat"])
                    lon = float(data[0]["lon"])
                    logger.info(f"Nominatim Geocoded '{location_name}' to ({lat}, {lon})")
                    return lat, lon
    except Exception as e:
        logger.warning(f"Nominatim geocoding failed for '{location_name}': {e}")

    # 2. Try OpenWeather Map Geocoding API if key is available
    if settings.OPENWEATHER_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                url = "http://api.openweathermap.org/geo/1.0/direct"
                response = await client.get(
                    url,
                    params={"q": location_name, "limit": 1, "appid": settings.OPENWEATHER_API_KEY},
                    timeout=5.0
                )
                if response.status_code == 200:
                    data = response.json()
                    if data and len(data) > 0:
                        lat = float(data[0]["lat"])
                        lon = float(data[0]["lon"])
                        logger.info(f"OpenWeather Geocoded '{location_name}' to ({lat}, {lon})")
                        return lat, lon
        except Exception as e:
            logger.warning(f"OpenWeather geocoding failed for '{location_name}': {e}")

    return None, None

async def reverse_geocode(latitude: float, longitude: float) -> str | None:
    """
    Reverse geocodes (latitude, longitude) to a city/location name.
    Tries Nominatim first, and if that fails, falls back to OpenWeatherMap Reverse Geocoding API if key is present.
    """
    # 1. Try Nominatim
    try:
        async with httpx.AsyncClient() as client:
            headers = {"User-Agent": "MonsoonCopilot/1.0 (monsoon-preparedness-citizen-assistance)"}
            url = "https://nominatim.openstreetmap.org/reverse"
            response = await client.get(
                url,
                params={"lat": latitude, "lon": longitude, "format": "json"},
                headers=headers,
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                if data:
                    address = data.get("address", {})
                    city = address.get("city") or address.get("town") or address.get("village") or address.get("suburb") or address.get("state")
                    if city:
                        logger.info(f"Nominatim Reverse Geocoded ({latitude}, {longitude}) to '{city}'")
                        return city
                    display_name = data.get("display_name")
                    if display_name:
                        # Extract the first few components of the display name
                        parts = [p.strip() for p in display_name.split(",")]
                        city = ", ".join(parts[:2])
                        logger.info(f"Nominatim Reverse Geocoded ({latitude}, {longitude}) to '{city}'")
                        return city
    except Exception as e:
        logger.warning(f"Nominatim reverse geocoding failed for ({latitude}, {longitude}): {e}")

    # 2. Try OpenWeather Reverse Geocoding API if key is available
    if settings.OPENWEATHER_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                url = "http://api.openweathermap.org/geo/1.0/reverse"
                response = await client.get(
                    url,
                    params={"lat": latitude, "lon": longitude, "limit": 1, "appid": settings.OPENWEATHER_API_KEY},
                    timeout=5.0
                )
                if response.status_code == 200:
                    data = response.json()
                    if data and len(data) > 0:
                        city = data[0].get("name")
                        state = data[0].get("state")
                        loc_name = f"{city}, {state}" if state else city
                        logger.info(f"OpenWeather Reverse Geocoded ({latitude}, {longitude}) to '{loc_name}'")
                        return loc_name
        except Exception as e:
            logger.warning(f"OpenWeather reverse geocoding failed for ({latitude}, {longitude}): {e}")

    return None
