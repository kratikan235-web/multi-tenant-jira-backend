from app.db.session import SessionLocal
from fastapi import Request
from sqlalchemy import text
from fastapi import HTTPException


def get_db(request: Request):
    db = SessionLocal()

    try:
        tenant = request.state.tenant

        # Skip tenant check for signup
        if request.url.path.startswith("/users/signup"):
            yield db
            return

        if tenant:
            # `tenant` can come from subdomain OR token claim.
            # Subdomain is lowercased in middleware, token claim stores `schema_name`.
            # We therefore resolve by schema_name first, then by (case-insensitive) name.
            exists = db.execute(
                text(
                    """
                    SELECT schema_name
                    FROM public.tenants
                    WHERE schema_name = :tenant
                       OR lower(name) = :tenant
                    """
                ),
                {"tenant": tenant.lower()},
            ).fetchone()

            if not exists:
                raise HTTPException(status_code=400, detail="Invalid tenant")

            schema = exists[0]

            db.execute(text(f'SET search_path TO "{schema}", public'))

        yield db

    finally:
        db.close()