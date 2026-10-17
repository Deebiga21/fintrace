from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    badge_id: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    investigator: dict

@router.post("/login", response_model=LoginResponse)
def login_investigator(req: LoginRequest):
    # Standard authorized demo investigator credential or any valid badge
    if req.badge_id and req.password:
        return {
            "access_token": "fintrace-jwt-token-demo-authorized-2026",
            "token_type": "bearer",
            "investigator": {
                "name": "Senior Investigator Vikramaditya",
                "badge_id": req.badge_id,
                "role": "Lead Financial Crime Investigator",
                "division": "Anti-Money Laundering & Mule Network Taskforce",
                "clearance_level": "Level 4 (Top Secret / FIU-IND)"
            }
        }
    raise HTTPException(status_code=401, detail="Invalid investigator credentials")

@router.get("/me")
def get_current_investigator():
    return {
        "name": "Senior Investigator Vikramaditya",
        "badge_id": "INV-7809-DELHI",
        "role": "Lead Financial Crime Investigator",
        "division": "Anti-Money Laundering & Mule Network Taskforce",
        "clearance_level": "Level 4 (Top Secret / FIU-IND)"
    }
