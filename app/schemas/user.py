from pydantic import BaseModel


class  SignupRequest(BaseModel):
    tenant_name: str
    email: str
    password: str

class AcceptInviteRequest(BaseModel):
    email: str
    password: str
    tenant: str



