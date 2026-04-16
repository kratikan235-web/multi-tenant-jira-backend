from app.db.dependencies import get_db
from app.schemas.task import TaskCreate, TaskUpdate
from fastapi import APIRouter, Depends, HTTPException
from app.db.dependencies import get_db
from fastapi.security import HTTPBearer
from app.models.task import Task
from app.core.security import get_current_user
from sqlalchemy import text

security = HTTPBearer()

router = APIRouter(prefix="/tasks", tags=["Tasks"])

# Create Task
@router.post("/tasks")
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

    return new_task

# Get Task by project_id
@router.get("/")
def get_tasks(
    project_id: int,
    db=Depends(get_db),
    user=Depends(get_current_user)
):
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    return tasks

# Update Task by task_id
@router.put("/{task_id}")
def update_task(
    task_id: int,
    data: TaskUpdate,
    db=Depends(get_db),
    user=Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        return {"error": "Task not found"}

    if data.title:
        task.title = data.title

    if data.description:
        task.description = data.description

    if data.status:
        task.status = data.status

    db.commit()
    db.refresh(task)

    return task

# Assign Task
@router.patch("/{task_id}/assign")
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
    return {"message": "Task assigned"}

# Update status
@router.patch("/{task_id}/status")
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

    return task