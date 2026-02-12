from datetime import datetime

from fastapi import APIRouter, Depends, Form

from auth import Auth
from data_access.logic import Logic
from data_access.models import Sites

site_routes = APIRouter()


@site_routes.get("/sites")
async def GetSites(auth_data: dict = Depends(Auth().verify_token)):
    """Get all active sites for authenticated user"""
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    user_id = auth_data.get("user_id")
    sites = Logic().get_by_query(
        "sites",
        {
            "user_id": user_id,
            "is_active": True,
        },
    )

    sites_response = []
    if sites:
        for site in sites:
            sites_response.append(
                {
                    "id": str(site["_id"]),
                    "name": site["name"],
                    "lat": site["lat"],
                    "long": site["long"],
                }
            )

    return {"status": "success", "sites": sites_response}


@site_routes.post("/site")
async def CreateSite(
    name: str = Form(...),
    lat: float = Form(...),
    long: float = Form(...),
    auth_data: dict = Depends(Auth().verify_token),
):
    """Create a new site for the authenticated user"""
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    user_id = auth_data.get("user_id")
    new_site = Sites(
        name=name,
        lat=lat,
        long=long,
        user_id=user_id,
        date_created=datetime.utcnow(),
        date_modified=datetime.utcnow(),
        is_active=True,
    )

    inserted_site = Logic().insert(new_site)
    return {"status": "success", "site_id": str(inserted_site)}
