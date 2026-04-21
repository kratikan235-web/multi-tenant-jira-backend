from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.auth.jwt import create_access_token
from app.db.dependencies import get_db
from app.core.security import get_current_user
from app.schemas.user import UserResponse, LoginRequest
from typing import List

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login")
def login(
    data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    email = data.email.strip()
    password = data.password
    tenant = data.tenant.strip().lower()

    # 1. CHECK TENANT FROM PUBLIC DB
    tenant_data = db.execute(
        text(
            """
            SELECT schema_name
            FROM public.tenants
            WHERE schema_name = :tenant
               OR lower(name) = :tenant
            """
        ),
        {"tenant": tenant},
    ).fetchone()

    if not tenant_data:
        raise HTTPException(status_code=404, detail="Tenant not found")

    schema = tenant_data.schema_name

    # 2. SWITCH SCHEMA
    db.execute(text(f'SET search_path TO "{schema}"'))

    # 3. FIND USER
    user = db.execute(text("""
        SELECT id, email, password, role
        FROM users
        WHERE email = :email
    """), {"email": email}).fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Invited users exist without password until they activate via accept-invite.
    if not user.password:
        raise HTTPException(
            status_code=403,
            detail="Please activate your account first (set your password from the invite link).",
        )

    # 4. CHECK PASSWORD
    if user.password != password:
        raise HTTPException(status_code=401, detail="Invalid password")

    # 5. CREATE TOKEN
    token = create_access_token({
        "user_id": user.id,
        "tenant": schema,
        "role": user.role
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.get("/users", response_model=List[UserResponse])
def get_users(
    db=Depends(get_db),
    user=Depends(get_current_user)
):
    users = db.execute(text("""
        SELECT id, email, role
        FROM users
        ORDER BY id
    """)).fetchall()

    return users
