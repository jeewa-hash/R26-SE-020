import os
import requests
from dotenv import load_dotenv

load_dotenv()

AUTH_API_URL = (
    os.getenv("AUTH_API_URL")
    or os.getenv("AUTH_SERVICE_URL")
    or "https://r26-auth-service.onrender.com"
).rstrip("/")
AUTH_PROVIDER_LIST_FALLBACK_URL = os.getenv(
    "AUTH_PROVIDER_LIST_FALLBACK_URL",
    "https://r26-auth-service.onrender.com/providers",
)

def get_current_user(token: str) -> dict:
    try:
        response = requests.get(
            f"{AUTH_API_URL}/profile",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
    except requests.exceptions.ConnectionError:
        raise Exception(f"Auth service unreachable at {AUTH_API_URL}.")
    except requests.exceptions.Timeout:
        raise Exception("Auth service timed out.")

    if response.status_code == 401:
        raise Exception("Invalid or expired token.")
    if not response.ok:
        raise Exception(f"Auth service error ({response.status_code})")

    data = response.json()
    user = data.get("provider") or data.get("user") or data
    if not user.get("_id"):
        raise Exception("Auth response missing user _id.")
    return user

    # =========================================================
# GET ALL SERVICE PROVIDERS
# =========================================================

def get_all_providers() -> list:
    urls = (
        f"{AUTH_API_URL.rstrip('/')}/providers",
        AUTH_PROVIDER_LIST_FALLBACK_URL,
    )
    last_error = None

    for url in dict.fromkeys(urls):
        try:
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            data = response.json()
            providers = data.get("providers", data) if isinstance(data, dict) else data
            if isinstance(providers, list):
                return providers
            last_error = Exception("Auth response does not contain a providers list.")
        except (requests.exceptions.RequestException, ValueError) as error:
            last_error = error

    raise Exception(f"Unable to retrieve providers from auth service: {last_error}")