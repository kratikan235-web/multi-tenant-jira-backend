from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.base import Base
from sqlalchemy import DateTime
from datetime import datetime

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True)

    title = Column(String, nullable=False)
    description = Column(String, nullable=True)

    status = Column(String, default="TODO")   # TODO / IN_PROGRESS / DONE
    priority = Column(String, default="MEDIUM")

    project_id = Column(Integer)  # no FK

    created_by = Column(Integer, ForeignKey("users.id"))
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
