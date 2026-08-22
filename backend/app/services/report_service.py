import os
from datetime import datetime

from app.database.models import Report, Company


async def generate_report(company_id: int, user_id: int, db) -> Report:
    from fpdf import FPDF

    company = await db.get(Company, company_id)
    
    class PDFReport(FPDF):
        def header(self):
            self.set_font('Arial', 'B', 12)
            self.cell(0, 10, 'Due Diligence Report', 0, 1, 'C')
        def footer(self):
            self.set_y(-15)
            self.set_font('Arial', 'I', 8)
            self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')
    
    pdf = PDFReport()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    pdf.cell(200, 10, txt=f"Due Diligence Report for {company.name if company else 'Unknown'}", ln=1, align='C')
    
    pdf.multi_cell(0, 10, "Executive Summary\n\n(Content gathered from analysis service goes here)")
    pdf.add_page()
    pdf.multi_cell(0, 10, "Company Overview\n\n...")
    pdf.add_page()
    pdf.multi_cell(0, 10, "Financial Performance\n\n...")
    pdf.add_page()
    pdf.multi_cell(0, 10, "Key Risks\n\n...")
    pdf.add_page()
    pdf.multi_cell(0, 10, "Growth Opportunities\n\n...")
    pdf.add_page()
    pdf.multi_cell(0, 10, "Sources and Citations\n\n...")
    
    reports_dir = "data/reports"
    os.makedirs(reports_dir, exist_ok=True)
    file_path = os.path.join(reports_dir, f"report_{company_id}_{int(datetime.now().timestamp())}.pdf")
    
    pdf.output(file_path)
    
    report = Report(
        company_id=company_id,
        user_id=user_id,
        title=f"Due Diligence Report - {company.name if company else 'Company'}",
        report_type="due_diligence",
        file_path=file_path,
        status="completed",
        content={"summary": "Report generated successfully."}
    )
    
    db.add(report)
    await db.commit()
    await db.refresh(report)
    
    return report
