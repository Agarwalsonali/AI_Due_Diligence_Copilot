from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import get_db
from app.database.models import User, Report
from app.core.security import get_current_user
from app.database.schemas import ReportGenerateRequest
from app.services.report_service import generate_report as generate_report_service
import os

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.post("/generate")
async def generate_report(req: ReportGenerateRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    report = await generate_report_service(req.company_id, user.id, db)
    return report

@router.get("/{id}")
async def get_report(id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    report = await db.get(Report, id)
    return report

@router.get("/{id}/download")
async def download_report(id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    report = await db.get(Report, id)
    if report and os.path.exists(report.file_path):
        return FileResponse(report.file_path, filename=f"report_{id}.pdf")
    return {"message": "File not found"}
