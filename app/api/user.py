from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.dependencies import get_db
from sqlalchemy import text
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import APIRouter, Depends, HTTPException, Request
from app.schemas.user import AcceptInviteRequest, SignupRequest

router = APIRouter(prefix="/users", tags=["Users"])

security = HTTPBearer()

@router.post("/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):

    schema = data.tenant_name.lower()

    # 1. CREATE SCHEMA
    db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))

    # 2. INSERT TENANT
    db.execute(text("""
        INSERT INTO public.tenants (name, schema_name)
        VALUES (:name, :schema)
    """), {
        "name": data.tenant_name,
        "schema": schema
    })

    # 3. CREATE TABLES
    db.execute(text(f"""
        CREATE TABLE IF NOT EXISTS "{schema}".users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255),
            role VARCHAR(20) DEFAULT 'USER'
        )
    """))

    db.execute(text(f"""
        CREATE TABLE IF NOT EXISTS "{schema}".projects (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255)
        )
    """))

    db.execute(text(f"""
        CREATE TABLE IF NOT EXISTS "{schema}".tasks (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255),
            status VARCHAR(50)
        )
    """))

    # 4. CREATE ADMIN
    db.execute(text(f"""
        INSERT INTO "{schema}".users (email, password, role)
        VALUES (:email, :password, 'ADMIN')
    """), {
        "email": data.email,
        "password": data.password
    })

    db.commit()

    return {"message": "Signup successful"}


@router.post("/invite")
def invite_user(
    request: Request,
    email: str,
    role: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    # ROLE CHECK (ADMIN only)
    if request.state.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only ADMIN can invite users")

    # SET SCHEMA (IMPORTANT - don’t rely blindly on get_db)
    db.execute(text(f'SET search_path TO "{request.state.tenant}"'))

    # Insert user
    db.execute(text("""
        INSERT INTO users (email, role)
        VALUES (:email, :role)
    """), {
        "email": email,
        "role": role.upper()   # normalize role
    })

    db.commit()

    return {
        "message": f"User {email} invited as {role}"
    }

@router.post("/accept-invite")
def accept_invite(
    data: AcceptInviteRequest,   # USE SCHEMA
    db: Session = Depends(get_db)
):
    # SET SCHEMA
    db.execute(text(f'SET search_path TO "{data.tenant}"'))

    user = db.execute(text("""
        SELECT id, password FROM users WHERE email = :email
    """), {"email": data.email}).fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.password:
        raise HTTPException(status_code=400, detail="User already activated")

    db.execute(text("""
        UPDATE users
        SET password = :password
        WHERE email = :email
    """), {
        "email": data.email,
        "password": data.password
    })

    db.commit()

    return {"message": "Account activated successfully"}