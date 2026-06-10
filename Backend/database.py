from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DB_NAME = os.getenv("MYSQLDATABASE", "remotein")
MYSQL_USER = os.getenv("MYSQLUSER", "root")
MYSQL_PASSWORD = os.getenv("MYSQLPASSWORD", "")
MYSQL_HOST = os.getenv("MYSQLHOST", "localhost")
MYSQL_PORT = os.getenv("MYSQLPORT", "3306")

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