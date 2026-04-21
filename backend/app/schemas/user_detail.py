from pydantic import BaseModel


class UserDetailResponse(BaseModel):
    id: int
    email: str
    role: str
    activated: bool

