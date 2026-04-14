from sqlalchemy import Column, Integer, String
from app.db.base import Base

class Tenant(Base):
    __tablename__ = "tenants"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    schema_name = Column(String, unique=True, nullable=False)