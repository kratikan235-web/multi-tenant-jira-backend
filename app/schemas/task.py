from pydantic import BaseModel
from typing import Optional

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: str
    assigned_to: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str]
    description: Optional[str]
    status: Optional[str]
    assigned_to: Optional[str]


class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    status: str
    project_id: int
    assigned_to: Optional[str]