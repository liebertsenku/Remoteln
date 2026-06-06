from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from database import get_db
from models.user import User, RoleEnum
from models.job import Job
from models.external import ExternalJob
from schemas.user import UserResponse
from auth.dependencies import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_jobseekers = db.query(func.count(User.id)).filter(User.role == RoleEnum.jobseeker).scalar() or 0
    total_employers = db.query(func.count(User.id)).filter(User.role == RoleEnum.employer).scalar() or 0
    
    total_internal_jobs = db.query(func.count(Job.id)).scalar() or 0
    total_external_jobs = db.query(func.count(ExternalJob.id)).scalar() or 0
    
    return {
        "users": {
            "total": total_users,
            "jobseekers": total_jobseekers,
            "employers": total_employers,
        },
        "jobs": {
            "internal": total_internal_jobs,
            "external": total_external_jobs,
        }
    }

@router.get("/users", response_model=List[UserResponse])
def get_recent_users(limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    users = db.query(User).order_by(User.created_at.desc()).limit(limit).all()
    return users
