from app.db.dependencies import get_db
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from fastapi import APIRouter, Depends, HTTPException
from app.db.dependencies import get_db
from fastapi.security import HTTPBearer
from app.models.task import Task
from app.core.security import get_current_user
from sqlalchemy import text
from typing import List
from app.utils.task import format_task_response

security = HTTPBearer()

router = APIRouter(prefix="/tasks", tags=["Tasks"])

# Create Task
@router.post("/", response_model=TaskResponse)
def create_task(task: TaskCreate, db=Depends(get_db), user=Depends(get_current_user)):
    
    new_task = Task(
        title=task.title,
        description=task.description,
        status="TODO",
        project_id=task.project_id,
        assigned_to=task.assigned_to,
        created_by=user.id
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return format_task_response(new_task, db)

# Get Task by project_id
@router.get("/", response_model=List[TaskResponse])
def get_tasks(
    project_id: int,
    db=Depends(get_db),
    user=Depends(get_current_user)
):
    
    # Check project exists
    project = db.execute(
        text("SELECT id FROM projects WHERE id = :id"),
        {"id": project_id}
    ).fetchone()

    if not project:
        raise HTTPException(status_code=404, detail="Project not exists")
    
    tasks = db.query(Task).filter(Task.project_id == project_id).all()

    return [format_task_response(task, db) for task in tasks]
     

# Update Task by task_id
@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db=Depends(get_db),
    user=Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if data.title is not None:
        task.title = data.title

    if data.description is not None:
        task.description = data.description

    if data.status is not None:
        task.status = data.status

    db.commit()
    db.refresh(task)

    return format_task_response(task, db)

# Assign Task
@router.patch("/{task_id}/assign", response_model=TaskResponse)
def assign_task(
    task_id: int,
    user_id: int,
    db=Depends(get_db),
    user=Depends(get_current_user)
):

    # ROLE CHECK
    if user.role not in ["ADMIN", "PM"]:
        raise HTTPException(
            status_code=403,
            detail="Only ADMIN or PM can assign tasks"
        )

    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # check user exists
    assigned_user = db.execute(
        text("SELECT id FROM users WHERE id = :id"),
        {"id": user_id}
    ).fetchone()

    if not assigned_user:
        raise HTTPException(status_code=404, detail="User not found")

    task.assigned_to = user_id

    db.commit()
    db.refresh(task)

    # return {"message": "Task assigned"}
    return format_task_response(task, db)

# Update status
@router.patch("/{task_id}/status", response_model=TaskResponse)
def change_status(
    task_id: int,
    status: str,
    db=Depends(get_db),
    user=Depends(get_current_user)
):
    allowed = ["TODO", "IN_PROGRESS", "DONE"]

    if status not in allowed:
        return {"error": "Invalid status"}

    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        return {"error": "Task not found"}

    task.status = status

    db.commit()
    db.refresh(task)

    return format_task_response(task, db)