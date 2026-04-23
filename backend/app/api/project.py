from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.dependencies import get_db
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.core.security import get_current_user

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


@router.put("/{project_id}")
def update_project(
    project_id: int,
    data: ProjectUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    role = (getattr(current_user, "role", None) or request.state.role or "").upper()
    if role not in ["ADMIN", "PM"]:
        raise HTTPException(status_code=403, detail="Only ADMIN or PM can update projects")

    existing = db.execute(
        text("SELECT id FROM projects WHERE id = :id"),
        {"id": project_id},
    ).fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.name is not None:
        db.execute(
            text("UPDATE projects SET name = :name, updated_at = :updated_at WHERE id = :id"),
            {"id": project_id, "name": data.name, "updated_at": datetime.utcnow()},
        )
        db.commit()

    updated = db.execute(
        text("SELECT id, name, created_by, created_at FROM projects WHERE id = :id"),
        {"id": project_id},
    ).mappings().first()

    return updated


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    role = (getattr(current_user, "role", None) or request.state.role or "").upper()
    if role not in ["ADMIN", "PM"]:
        raise HTTPException(status_code=403, detail="Only ADMIN or PM can delete projects")

    existing = db.execute(
        text("SELECT id FROM projects WHERE id = :id"),
        {"id": project_id},
    ).fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    # Delete tasks first to avoid FK constraint issues.
    db.execute(text("DELETE FROM tasks WHERE project_id = :id"), {"id": project_id})
    db.execute(text("DELETE FROM projects WHERE id = :id"), {"id": project_id})
    db.commit()

    return {"message": "Project deleted"}