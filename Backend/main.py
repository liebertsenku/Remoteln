from fastapi import FastAPI
from sqlalchemy import text
from database import engine, Base, DB_NAME

# Import models sebelum create_all agar relasi terbaca dengan benar
from models import user, job, external, profile, application, saved_job

# Import routers
from routers import auth, jobs, external, profiles, applications, saved_jobs, admin

from migrate_role_enum import migrate as migrate_roles
from seed import seed_data
from contextlib import asynccontextmanager

def run_migrations():
    try:
        with engine.connect() as conn:
            # 1. Buat requested_by nullable jika belum
            try:
                conn.execute(text(
                    "ALTER TABLE external_sync_requests MODIFY COLUMN requested_by INT NULL"
                ))
                conn.commit()
                print("✅ Migration: requested_by is now nullable")
            except Exception:
                pass  # Sudah nullable atau tabel belum ada, skip

            # 2. Tambah kolom client_identifier jika belum ada
            try:
                result = conn.execute(text(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS "
                    "WHERE TABLE_SCHEMA = :schema "
                    "AND TABLE_NAME = 'external_sync_requests' "
                    "AND COLUMN_NAME = 'client_identifier'"
                ), {"schema": DB_NAME})
                (col_exists,) = result.fetchone()

                if col_exists == 0:
                    conn.execute(text(
                        "ALTER TABLE external_sync_requests "
                        "ADD COLUMN client_identifier VARCHAR(255) NULL"
                    ))
                    conn.commit()
                    print("✅ Migration: client_identifier column added")
                else:
                    print("ℹ️  Migration: client_identifier already exists, skipped")
            except Exception as e:
                print(f"⚠️ Migration for external_sync_requests failed: {e}")

        try:
            migrate_roles()
        except Exception as e:
            print(f"⚠️  Migration for roles failed: {e}")
    except Exception as e:
        print(f"❌ Failed to connect to engine for migrations: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting up... Running DB migrations and seeding...")
    try:
        Base.metadata.create_all(bind=engine)
        run_migrations()
        seed_data()
        print("✅ DB initialization completed")
    except Exception as e:
        print(f"❌ DB initialization failed: {e}")
    yield
    print("🛑 Shutting down...")

from starlette.requests import Request
from starlette.middleware.base import BaseHTTPMiddleware

app = FastAPI(
    title="RemoteIn API",
    description="Platform lowongan kerja remote: RESTful API berbasis FastAPI",
    version="1.0.0",
    lifespan=lifespan
)

class StripAPIPrefixMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.scope.get("path", "")
        if path.startswith("/api"):
            request.scope["path"] = path[4:] or "/"
        return await call_next(request)

app.add_middleware(StripAPIPrefixMiddleware)

# Daftarkan semua router
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(external.router)
app.include_router(profiles.router)
app.include_router(applications.router)
app.include_router(saved_jobs.router)
app.include_router(admin.router)

@app.get("/", tags=["Root"])
def root():
    return {
        "app": "RemoteIn API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }
