from fastapi import FastAPI
from app.api.auth import router as auth_router
from app.api.user import router as user_router
from app.api import project, task
from app.middleware.tenant_middleware import TenantMiddleware
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="Multi-Tenant Jira")

app.add_middleware(
    CORSMiddleware,
    # Support tenant subdomains like `ui_test.localhost:5173` too.
    allow_origin_regex=r"^https?://([a-z0-9-_]+\.)?localhost:5173$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(TenantMiddleware)
security = HTTPBearer()

app.include_router(user_router)
app.include_router(auth_router)
app.include_router(project.router)
app.include_router(task.router)

