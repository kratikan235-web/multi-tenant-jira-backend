from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.dependencies import get_db
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("/")
def create_project(
    name: str,
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    # ROLE CHECK
    if request.state.role not in ["ADMIN", "PM"]:
        raise HTTPException(
            status_code=403,
            detail=f"User with role '{request.state.role}' is not allowed to create projects"
        )

    db.execute(text(f'SET search_path TO "{request.state.tenant}"'))

    db.execute(text("""
        INSERT INTO projects (name)
        VALUES (:name)
    """), {"name": name})

    db.commit()

    return {"message": "Project created successfully"}

@router.get("/")
def get_projects(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
 # 🔥 ADD THIS
    db: Session = Depends(get_db)
):
    db.execute(text(f'SET search_path TO "{request.state.tenant}"'))

    result = db.execute(text("""
        SELECT id, name FROM projects
    """)).mappings().all()

    return {"projects": result}