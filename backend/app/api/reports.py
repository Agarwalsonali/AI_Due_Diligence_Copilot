from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.database.models import User, Report
from app.core.security import get_current_user
from app.database.schemas import ReportGenerateRequest, ReportResponse
from app.services.report_service import generate_report as generate_report_service
import os
from typing import List

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("", response_model=List[ReportResponse])
async def list_reports(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all reports for the current user."""
    stmt = (
        select(Report)
        .where(Report.user_id == user.id)
        .order_by(Report.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/generate")
async def generate_report(req: ReportGenerateRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    report = await generate_report_service(req.company_id, user.id, db)
    return ReportResponse.model_validate(report)

@router.get("/{id}", response_model=ReportResponse)
async def get_report(id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    report = await db.get(Report, id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    return ReportResponse.model_validate(report)

@router.get("/{id}/download")
async def download_report(id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    report = await db.get(Report, id)
    if report and os.path.exists(report.file_path):
        return FileResponse(report.file_path, filename=f"report_{id}.pdf")
    return {"message": "File not found"}
