from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DB_NAME = os.getenv("MYSQLDATABASE", os.getenv("DB_NAME", "remotein")).strip()
MYSQL_USER = os.getenv("MYSQLUSER", os.getenv("DB_USER", "root")).strip()
MYSQL_PASSWORD = os.getenv("MYSQLPASSWORD", os.getenv("DB_PASSWORD", "")).strip()
MYSQL_HOST = os.getenv("MYSQLHOST", os.getenv("DB_HOST", "localhost")).strip()
MYSQL_PORT = os.getenv("MYSQLPORT", os.getenv("DB_PORT", "3306")).strip()

DATABASE_URL = (
    f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{DB_NAME}"
)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()