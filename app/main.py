from fastapi import FastAPI
from app.api.auth import router as auth_router
from app.api.user import router as user_router
from app.api import project
from app.middleware.tenant_middleware import TenantMiddleware
from fastapi.security import HTTPBearer


app = FastAPI(title="Multi-Tenant Jira")

app.add_middleware(TenantMiddleware)
security = HTTPBearer()

app.include_router(user_router)
app.include_router(auth_router)
app.include_router(project.router)
