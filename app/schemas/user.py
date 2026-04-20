from pydantic import BaseModel


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

