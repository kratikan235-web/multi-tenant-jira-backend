from app.db.session import SessionLocal
from fastapi import Request
from sqlalchemy import text
from fastapi import HTTPException


def get_db(request: Request):
    db = SessionLocal()

    try:
        tenant = getattr(request.state, "tenant", None)

        if tenant:
            exists = db.execute(
                text("""
                    SELECT 1 FROM information_schema.schemata
                    WHERE schema_name = :schema
                """),
                {"schema": tenant}
            ).scalar()

            if not exists:
                raise HTTPException(status_code=400, detail="Invalid tenant")

            db.execute(text("SET search_path TO :schema, public"), {"schema": tenant})
            db.commit()

        yield db

    finally:
        db.close()