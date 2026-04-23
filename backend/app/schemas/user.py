from pydantic import BaseModel
from typing import Optional


class  SignupRequest(BaseModel):
    tenant_name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str
    tenant: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: str

class AcceptInviteRequest(BaseModel):
    email: str
    password: str


class UserUpdateRequest(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

