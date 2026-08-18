import os
import requests
from dotenv import load_dotenv

load_dotenv()

AUTH_API_URL = os.getenv("AUTH_API_URL", "http://localhost:4003/")

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
    try:
        response = requests.get(
            f"{AUTH_API_URL}/providers",
            timeout=5
        )

    except requests.exceptions.ConnectionError:
        raise Exception(
            f"Auth service unreachable at {AUTH_API_URL}."
        )

    except requests.exceptions.Timeout:
        raise Exception(
            "Auth service timed out."
        )

    except requests.exceptions.RequestException as e:
        raise Exception(
            f"Auth service request failed: {str(e)}"
        )

    # ---------------------------------------------------------
    # Check response
    # ---------------------------------------------------------

    if not response.ok:
        raise Exception(
            f"Auth service error ({response.status_code}): "
            f"{response.text}"
        )

    # ---------------------------------------------------------
    # Parse JSON
    # ---------------------------------------------------------

    data = response.json()

    providers = data.get(
        "providers",
        data
    )

    # ---------------------------------------------------------
    # Validate provider list
    # ---------------------------------------------------------

    if not isinstance(providers, list):
        raise Exception(
            "Auth response does not contain a providers list."
        )

    return providers