from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.dependencies import get_db
from sqlalchemy import text
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import APIRouter, Depends, HTTPException, Request
from app.schemas.user import AcceptInviteRequest, SignupRequest
from app.db.base import Base
from fastapi.responses import RedirectResponse


router = APIRouter(prefix="/users", tags=["Users"])

security = HTTPBearer()


@router.post("/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):

    schema = data.tenant_name.lower()

    existing = db.execute(text("""
    SELECT * FROM public.tenants WHERE name = :name
"""), {"name": data.tenant_name}).fetchone()

    if existing:
      raise HTTPException(status_code=400, detail="Tenant already exists")

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

    db.commit()  # commit before using connection

    # 3. CREATE TABLES USING CONNECTION
    engine = db.get_bind()

    with engine.connect() as conn:
        conn.execute(text(f'SET search_path TO "{schema}"'))
        Base.metadata.create_all(bind=conn)
        conn.commit()

    # 4. CREATE ADMIN (use same schema explicitly)
    db.execute(text(f"""
        INSERT INTO "{schema}".users (email, password, role)
        VALUES (:email, :password, 'ADMIN')
    """), {
        "email": data.email,
        "password": data.password
    })

    db.commit()

    return {"message": "Signup successful", "tenant_url": f"http://{schema}.localhost:8004"}

# send invite
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

    # SET SCHEMA
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

# Accept invite
@router.post("/accept-invite")
def accept_invite(
    request: Request,
    data: AcceptInviteRequest,
    db: Session = Depends(get_db)
):
    # tenant from URL (secure)
    tenant = request.state.tenant

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

    return {"message": f"Account activated in tenant '{tenant}'"}
