from pydantic import BaseModel
from typing import Optional

class UserMini(BaseModel):
    id: int
    email: str

class ProjectMini(BaseModel):
    id: int
    name: str

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: int
    assigned_to: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str

    project: Optional[ProjectMini]
    assigned_to: Optional[UserMini]
    created_by: UserMini

    class Config:
        from_attributes = True