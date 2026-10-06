from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.database.models import User, Company, Report
from app.core.security import get_current_user
from app.database.schemas import ReportGenerateRequest, ReportResponse, ComparisonReportRequest
from app.services.report_service import generate_report as generate_report_service
from app.services.report_service import generate_comparison_report as generate_comparison_report_service
import os
import re
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
    """Generate a due diligence report for a company the user owns."""
    company = await db.get(Company, req.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")
    if company.created_by != user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
    report = await generate_report_service(req.company_id, user.id, db)
    return ReportResponse.model_validate(report)

@router.post("/generate-comparison", response_model=ReportResponse)
async def generate_comparison_report(req: ComparisonReportRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Generate a comparative due diligence PDF for 2-4 companies the user owns."""
    company_ids = list(dict.fromkeys(req.company_ids))  # dedupe, keep order
    if not (2 <= len(company_ids) <= 4):
        raise HTTPException(status_code=400, detail="Select between 2 and 4 companies to compare.")
    for cid in company_ids:
        company = await db.get(Company, cid)
        if not company:
            raise HTTPException(status_code=404, detail=f"Company {cid} not found.")
        if company.created_by != user.id:
            raise HTTPException(status_code=403, detail="Access denied.")
    try:
        report = await generate_comparison_report_service(company_ids, user.id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return ReportResponse.model_validate(report)

@router.get("/{id}", response_model=ReportResponse)
async def get_report(id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    report = await db.get(Report, id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    if report.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return ReportResponse.model_validate(report)

def _download_filename(report: Report) -> str:
    """Browser-friendly filename derived from the report title."""
    slug = re.sub(r"[^a-z0-9]+", "-", (report.title or "report").lower()).strip("-")
    return f"{slug or 'report'}-{report.id}.pdf"


@router.get("/{id}/download")
async def download_report(id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    report = await db.get(Report, id)
    if not report or report.user_id != user.id:
        raise HTTPException(status_code=404, detail="Report not found.")
    filename = _download_filename(report)
    # Reports generated since 2026-10 are stored as bytes in the DB.
    if report.file_data:
        return Response(
            content=report.file_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    # Legacy rows (pre-2026-10) point at a file path.
    if report.file_path and os.path.exists(report.file_path):
        return FileResponse(report.file_path, filename=filename)
    raise HTTPException(status_code=404, detail="Report file not found.")
