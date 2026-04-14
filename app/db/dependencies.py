from app.db.session import SessionLocal
from fastapi import Request
from sqlalchemy import text


def get_db(request: Request):
    db = SessionLocal()

    try:
        # Apply tenant schema automatically
        tenant = getattr(request.state, "tenant", None)

        if tenant:
            db.execute(text(f'SET search_path TO "{tenant}"'))

        yield db

    finally:
        db.close()