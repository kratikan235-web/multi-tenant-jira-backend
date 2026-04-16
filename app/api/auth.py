from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.auth.jwt import create_access_token
from app.db.dependencies import get_db
from app.core.security import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login")
def login(request: Request, email: str, password: str, tenant: str, db: Session = Depends(get_db)):

    # 1. CHECK TENANT FROM PUBLIC DB
    tenant_data = db.execute(text("""
        SELECT schema_name FROM public.tenants
        WHERE schema_name = :tenant
    """), {"tenant": tenant}).fetchone()

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

    # 4. CHECK PASSWORD
    if user.password != password:
        raise HTTPException(status_code=401, detail="Invalid password")

    # 5. CREATE TOKEN
    token = create_access_token({
        "user_id": user.id,
        "tenant": request.state.tenant,
        "role": user.role
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.get("/users")
def get_users(
    db=Depends(get_db),
    user=Depends(get_current_user)
):
    users = db.execute(text("""
        SELECT id, email, role
        FROM users
        ORDER BY id
    """)).fetchall()

    return [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role
        }
        for u in users
    ]
