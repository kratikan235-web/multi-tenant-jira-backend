from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.dependencies import get_db
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime
from app.schemas.project import ProjectCreate

security = HTTPBearer()

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("/")
def create_project(
    data: ProjectCreate,
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

    db.execute(text("""
    INSERT INTO projects (name, created_by, created_at, updated_at)
    VALUES (:name, :created_by, :created_at, :updated_at)
"""), {
    "name": data.name,
    "created_by": request.state.user_id,
    "created_at": datetime.utcnow(),
    "updated_at": datetime.utcnow()
})

    db.commit()

    return {"message": "Project created successfully"}


@router.get("/")
def get_projects(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    result = db.execute(text("""
        SELECT id, name, created_by, created_at
        FROM projects
    """)).mappings().all()

    return {"projects": result}


@router.get("/{project_id}")
def get_project_detail(
    project_id: int,
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    result = db.execute(text("""
        SELECT id, name, created_by, created_at
        FROM projects
        WHERE id = :id
    """), {"id": project_id}).mappings().first()

    if not result:
        raise HTTPException(status_code=404, detail="Project not found")

    return result