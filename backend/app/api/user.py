from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.dependencies import get_db
from sqlalchemy import text
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import APIRouter, Depends, HTTPException, Request
from app.schemas.user import AcceptInviteRequest, SignupRequest, UserUpdateRequest
from app.schemas.user_detail import UserDetailResponse
from app.db.base import Base
from fastapi.responses import RedirectResponse
from app.core.security import get_current_user
from app.utils.email import send_invite_email
from urllib.parse import quote


router = APIRouter(prefix="/users", tags=["Users"])

security = HTTPBearer()


@router.post("/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):

    tenant_name = data.tenant_name.strip()
    schema = tenant_name.lower()

    existing = db.execute(text("""
    SELECT id
    FROM public.tenants
    WHERE lower(name) = :name
       OR schema_name = :schema
"""), {"name": schema, "schema": schema}).fetchone()

    if existing:
      raise HTTPException(status_code=400, detail="Tenant already exists")

    # 1. CREATE SCHEMA
    db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))

    # 2. INSERT TENANT
    db.execute(text("""
        INSERT INTO public.tenants (name, schema_name)
        VALUES (:name, :schema)
    """), {
        "name": tenant_name,
        "schema": schema
    })

    db.commit()  # commit before using connection

    # 3. CREATE TABLES USING CONNECTION
    engine = db.get_bind()

    with engine.connect() as conn:
        conn.execute(text(f'SET search_path TO "{schema}"'))
        Base.metadata.create_all(bind=conn)

        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS project_members (
            id SERIAL PRIMARY KEY,
            project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            added_at TIMESTAMP DEFAULT NOW(),
            UNIQUE (project_id, user_id)
        )
    """))
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

    return {"message": "Signup successful", "tenant_url": f"http://{schema}.localhost:5173"}

# send invite
@router.post("/invite")
def invite_user(
    request: Request,
    email: str,
    role: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    # ROLE CHECK (ADMIN / PM only)
    if request.state.role not in ["ADMIN", "PM"]:
        raise HTTPException(status_code=403, detail="Only ADMIN or PM can invite users")

    # check if user already exists
    existing = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": email}
    ).fetchone()

    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    # Insert user
    db.execute(text("""
        INSERT INTO users (email, role)
        VALUES (:email, :role)
    """), {
        "email": email,
        "role": role.upper()   # normalize role
    })

    db.commit()

    tenant = request.state.tenant or ""
    activation_url = f"http://{tenant}.localhost:5173/accept-invite?email={quote(email)}" if tenant else ""

    sent = False
    if activation_url:
        try:
            sent = send_invite_email(to_email=email, tenant=tenant, activation_url=activation_url)
        except Exception:
            # Don't fail the invite on email errors; the UI can still show the activation link.
            sent = False

    msg = f"User {email} invited as {role}."
    if activation_url:
        msg += " Ask them to activate using the invite link."

    return {
        "message": msg,
        "activation_url": activation_url,
        "email_sent": sent,
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

    return {
        "message": "Account activated successfully",
        "tenant": tenant,
        "email": data.email
    }


@router.get("/{user_id}", response_model=UserDetailResponse)
def get_user_detail(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Permissions:
    # - ADMIN/PM can view any user in tenant
    # - USER can view only self
    role = getattr(current_user, "role", None) or request.state.role
    caller_id = getattr(current_user, "id", None) or request.state.user_id

    if role not in ["ADMIN", "PM"] and int(caller_id) != int(user_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    user = db.execute(
        text("SELECT id, email, role, password FROM users WHERE id = :id"),
        {"id": user_id},
    ).fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "activated": bool(user.password),
    }


@router.put("/{user_id}", response_model=UserDetailResponse)
def update_user(
    user_id: int,
    data: UserUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Permissions:
    # - ADMIN can update anyone
    # - PM can update role for non-ADMIN users
    # - USER can only update self email (optional)
    role = (getattr(current_user, "role", None) or request.state.role or "").upper()
    caller_id = int(getattr(current_user, "id", None) or request.state.user_id or 0)

    target = db.execute(
        text("SELECT id, email, role, password FROM users WHERE id = :id"),
        {"id": user_id},
    ).fetchone()

    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target_role = (target.role or "").upper()

    if role not in ["ADMIN", "PM"] and caller_id != int(user_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    if role == "PM" and target_role == "ADMIN":
        raise HTTPException(status_code=403, detail="PM cannot modify ADMIN user")

    if role not in ["ADMIN", "PM"] and data.role is not None:
        raise HTTPException(status_code=403, detail="Not allowed to change role")

    updates = {}
    if data.email is not None:
        updates["email"] = data.email.strip()
    if data.role is not None:
        updates["role"] = data.role.strip().upper()

    if updates:
        # email uniqueness
        if "email" in updates:
            existing = db.execute(
                text("SELECT id FROM users WHERE lower(email) = lower(:email) AND id != :id"),
                {"email": updates["email"], "id": user_id},
            ).fetchone()
            if existing:
                raise HTTPException(status_code=400, detail="Email already in use")

        db.execute(
            text(
                """
                UPDATE users
                SET email = COALESCE(:email, email),
                    role = COALESCE(:role, role)
                WHERE id = :id
                """
            ),
            {"id": user_id, "email": updates.get("email"), "role": updates.get("role")},
        )
        db.commit()

    updated = db.execute(
        text("SELECT id, email, role, password FROM users WHERE id = :id"),
        {"id": user_id},
    ).fetchone()

    return {
        "id": updated.id,
        "email": updated.email,
        "role": updated.role,
        "activated": bool(updated.password),
    }


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    role = (getattr(current_user, "role", None) or request.state.role or "").upper()
    caller_id = int(getattr(current_user, "id", None) or request.state.user_id or 0)

    if role not in ["ADMIN", "PM"]:
        raise HTTPException(status_code=403, detail="Only ADMIN or PM can delete users")

    if int(user_id) == caller_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    target = db.execute(
        text("SELECT id, role FROM users WHERE id = :id"),
        {"id": user_id},
    ).fetchone()

    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target_role = (target.role or "").upper()
    if role == "PM" and target_role == "ADMIN":
        raise HTTPException(status_code=403, detail="PM cannot delete ADMIN user")

    # Block delete if user owns projects or created tasks; null out assignments.
    owns_projects = db.execute(
        text("SELECT 1 FROM projects WHERE created_by = :id LIMIT 1"),
        {"id": user_id},
    ).fetchone()
    if owns_projects:
        raise HTTPException(status_code=400, detail="User cannot be deleted: owns projects")

    created_tasks = db.execute(
        text("SELECT 1 FROM tasks WHERE created_by = :id LIMIT 1"),
        {"id": user_id},
    ).fetchone()
    if created_tasks:
        raise HTTPException(status_code=400, detail="User cannot be deleted: created tasks")

    # Remove as assignee from tasks
    db.execute(text("UPDATE tasks SET assigned_to = NULL WHERE assigned_to = :id"), {"id": user_id})
    db.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
    db.commit()

    return {"message": "User deleted"}
