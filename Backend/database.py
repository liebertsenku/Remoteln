from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = (
    f"mysql+pymysql://"
    f"{os.getenv('MYSQLUSER')}:"
    f"{os.getenv('MYSQLPASSWORD')}@"
    f"{os.getenv('MYSQLHOST')}:"
    f"{os.getenv('MYSQLPORT')}/"
    f"{os.getenv('MYSQLDATABASE')}"
)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)