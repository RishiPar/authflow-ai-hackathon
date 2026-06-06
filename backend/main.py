import json
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from datetime import datetime

from sqlalchemy.orm import Session

from schemas import (
    IntakeCreate, 
    PatientResponse, 
    DocumentUpdate, 
    DetailedAnalysisResponse, 
    DashboardMetricsResponse, 
    PayerPolicyResponse, 
    AuditLogResponse,
    AnalyzeRequest,
    DocumentState
)
from rules import evaluate_weighted_rules
from database import (
    init_db, 
    seed_mock_data, 
    SessionLocal, 
    Patient, 
    InsuranceInfo, 
    ProcedureRequest, 
    PatientDocuments, 
    AnalysisResult, 
    AuditLog, 
    PayerPolicy
)

app = FastAPI(
    title="AuthFlow AI - Intelligent Healthcare Operations API",
    description="Multi-payer, multi-procedure hospital pre-visit screening and denial prevention API.",
    version="2.0.0"
)

# Enable CORS for Next.js frontend local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Startup event to init and seed database
@app.on_event("startup")
def startup_event():
    init_db()
    seed_mock_data()
    
    # Calculate analysis for seeded patients if missing
    db = SessionLocal()
    try:
        patients = db.query(Patient).all()
        for p in patients:
            if not p.analysis:
                analysis = evaluate_weighted_rules(p.id, p)
                db_analysis = AnalysisResult(
                    patient_id=p.id,
                    initial_risk_score=analysis.initial_risk_score,
                    initial_denial_risk=analysis.initial_denial_risk,
                    projected_risk_score=analysis.projected_risk_after_actions,
                    projected_denial_risk="Low" if analysis.projected_risk_after_actions <= 30 else "Medium",
                    analysis_json=json.dumps(analysis.model_dump())
                )
                db.add(db_analysis)
        db.commit()
    finally:
        db.close()

# Helper to construct PatientResponse
def construct_patient_response(p: Patient) -> PatientResponse:
    # Handle optional analysis parsing
    analysis_data = None
    if p.analysis:
        analysis_data = DetailedAnalysisResponse(**json.loads(p.analysis.analysis_json))

    doc_state = DocumentState(
        insurance_card=p.documents.insurance_card,
        eligibility_verification=p.documents.eligibility_verification,
        physician_order=p.documents.physician_order,
        diagnosis_code_doc=p.documents.diagnosis_code_doc,
        clinical_notes=p.documents.clinical_notes,
        referral=p.documents.referral,
        conservative_treatment=p.documents.conservative_treatment,
        physical_therapy_notes=p.documents.physical_therapy_notes,
        prior_auth_form=p.documents.prior_auth_form,
        payer_policy_reference=p.documents.payer_policy_reference
    )

    return PatientResponse(
        id=p.id,
        name=p.name,
        age=p.age,
        symptoms=p.symptoms,
        symptoms_duration_weeks=p.symptoms_duration_weeks,
        referral_status=p.referral_status,
        status=p.status,
        provider=p.insurance.provider,
        plan_type=p.insurance.plan_type,
        eligibility_verified=p.insurance.eligibility_verified,
        procedure_name=p.procedure_request.procedure_name,
        diagnosis_code=p.procedure_request.diagnosis_code,
        documents=doc_state,
        analysis=analysis_data,
        created_at=p.created_at.isoformat()
    )

# 1. POST /api/intake: Submit intake form
@app.post("/api/intake", response_model=PatientResponse, status_code=201)
def create_intake(request: IntakeCreate, db: Session = Depends(get_db)):
    try:
        # Create Patient record
        p = Patient(
            name=request.patient_name,
            age=request.age,
            symptoms=request.symptoms,
            symptoms_duration_weeks=request.symptoms_duration_weeks,
            referral_status=request.referral_status,
            status="Needs Documentation"
        )
        db.add(p)
        db.commit()
        db.refresh(p)

        # Create Insurance info
        elig_verified = request.documents_provided.eligibility_verification
        ins = InsuranceInfo(
            patient_id=p.id,
            provider=request.insurance_provider,
            plan_type=request.insurance_plan_type,
            eligibility_verified=elig_verified
        )
        db.add(ins)

        # Create Procedure request
        proc = ProcedureRequest(
            patient_id=p.id,
            procedure_name=request.requested_procedure,
            diagnosis_code=request.diagnosis_code
        )
        db.add(proc)

        # Create Documents
        docs = PatientDocuments(
            patient_id=p.id,
            insurance_card=request.documents_provided.insurance_card,
            eligibility_verification=request.documents_provided.eligibility_verification,
            physician_order=request.documents_provided.physician_order,
            diagnosis_code_doc=request.documents_provided.diagnosis_code_doc,
            clinical_notes=request.documents_provided.clinical_notes,
            referral=request.documents_provided.referral,
            conservative_treatment=request.documents_provided.conservative_treatment,
            physical_therapy_notes=request.documents_provided.physical_therapy_notes,
            prior_auth_form=request.documents_provided.prior_auth_form,
            payer_policy_reference=request.documents_provided.payer_policy_reference
        )
        db.add(docs)
        db.commit()
        db.refresh(p)

        # Log audit trail
        log = AuditLog(
            patient_id=p.id,
            action="Patient intake submitted",
            details=f"Intake form created for {p.name}. Procedure: {proc.procedure_name} under {ins.provider}."
        )
        db.add(log)
        db.commit()

        # Run Analysis
        analysis = evaluate_weighted_rules(p.id, p)
        db_analysis = AnalysisResult(
            patient_id=p.id,
            initial_risk_score=analysis.initial_risk_score,
            initial_denial_risk=analysis.initial_denial_risk,
            projected_risk_score=analysis.projected_risk_after_actions,
            projected_denial_risk="Low" if analysis.projected_risk_after_actions <= 30 else "Medium",
            analysis_json=json.dumps(analysis.model_dump())
        )
        db.add(db_analysis)
        
        # Determine Status dynamically
        if analysis.initial_denial_risk == "High":
            p.status = "High Risk"
        elif not elig_verified:
            p.status = "Needs Eligibility Verification"
        elif len(analysis.missing_documents) > 0:
            p.status = "Needs Documentation"
        else:
            p.status = "Ready to Submit"
            
        db.commit()
        db.refresh(p)

        return construct_patient_response(p)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Intake submission failed: {str(e)}")

# 2. GET /api/patients: Get all patients in the queue
@app.get("/api/patients", response_model=List[PatientResponse])
def read_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).order_by(Patient.created_at.desc()).all()
    return [construct_patient_response(p) for p in patients]

# 3. GET /api/patients/{patient_id}: Get patient details
@app.get("/api/patients/{patient_id}", response_model=PatientResponse)
def read_patient(patient_id: int, db: Session = Depends(get_db)):
    p = db.query(Patient).filter(Patient.id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient record not found")
    return construct_patient_response(p)

# 4. POST /api/analyze: Re-run analysis
@app.post("/api/analyze", response_model=DetailedAnalysisResponse)
def analyze_patient(request: AnalyzeRequest, db: Session = Depends(get_db)):
    p = db.query(Patient).filter(Patient.id == request.patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient record not found")
    
    analysis = evaluate_weighted_rules(p.id, p)
    
    # Update analysis result table
    db_analysis = db.query(AnalysisResult).filter(AnalysisResult.patient_id == p.id).first()
    if db_analysis:
        db_analysis.initial_risk_score = analysis.initial_risk_score
        db_analysis.initial_denial_risk = analysis.initial_denial_risk
        db_analysis.projected_risk_score = analysis.projected_risk_after_actions
        db_analysis.projected_denial_risk = "Low" if analysis.projected_risk_after_actions <= 30 else "Medium"
        db_analysis.analysis_json = json.dumps(analysis.model_dump())
    else:
        db_analysis = AnalysisResult(
            patient_id=p.id,
            initial_risk_score=analysis.initial_risk_score,
            initial_denial_risk=analysis.initial_denial_risk,
            projected_risk_score=analysis.projected_risk_after_actions,
            projected_denial_risk="Low" if analysis.projected_risk_after_actions <= 30 else "Medium",
            analysis_json=json.dumps(analysis.model_dump())
        )
        db.add(db_analysis)
        
    # Log audit
    log = AuditLog(
        patient_id=p.id,
        action="AI analysis executed",
        details=f"Risk calculations updated. Initial score: {analysis.initial_risk_score} ({analysis.initial_denial_risk})."
    )
    db.add(log)
    
    db.commit()
    return analysis

# 5. PATCH /api/patients/{patient_id}/documents: Update documents provided
@app.patch("/api/patients/{patient_id}/documents", response_model=PatientResponse)
def update_documents(patient_id: int, request: DocumentUpdate, db: Session = Depends(get_db)):
    p = db.query(Patient).filter(Patient.id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient record not found")
    
    docs = p.documents
    audit_changes = []
    
    # Update attributes dynamically
    for key, value in request.model_dump(exclude_unset=True).items():
        old_val = getattr(docs, key)
        if old_val != value:
            setattr(docs, key, value)
            doc_label = key.replace("_", " ").title()
            status_text = "Verified" if value else "Removed"
            audit_changes.append(f"{doc_label} {status_text}")
            
            # Special link: if eligibility_verification is updated, update eligibility_verified on insurance
            if key == "eligibility_verification":
                p.insurance.eligibility_verified = value

    if audit_changes:
        db.commit()
        db.refresh(p)
        
        # Log to audit trail
        log = AuditLog(
            patient_id=p.id,
            action="Clinical checklist modified",
            details="Staff updated checklist: " + ", ".join(audit_changes)
        )
        db.add(log)
        
        # Re-run analyzer & update results
        analysis = evaluate_weighted_rules(p.id, p)
        db_analysis = db.query(AnalysisResult).filter(AnalysisResult.patient_id == p.id).first()
        if db_analysis:
            db_analysis.initial_risk_score = analysis.initial_risk_score
            db_analysis.initial_denial_risk = analysis.initial_denial_risk
            db_analysis.projected_risk_score = analysis.projected_risk_after_actions
            db_analysis.projected_denial_risk = "Low" if analysis.projected_risk_after_actions <= 30 else "Medium"
            db_analysis.analysis_json = json.dumps(analysis.model_dump())
            
        # Dynamically change patient queue status
        if analysis.initial_denial_risk == "High":
            p.status = "High Risk"
        elif not p.insurance.eligibility_verified:
            p.status = "Needs Eligibility Verification"
        elif len(analysis.missing_documents) > 0:
            p.status = "Needs Documentation"
        else:
            p.status = "Ready to Submit"
            
        db.commit()
        db.refresh(p)
        
    return construct_patient_response(p)

# 6. GET /api/dashboard-metrics: Get metrics for summary cards
@app.get("/api/dashboard-metrics", response_model=DashboardMetricsResponse)
def read_dashboard_metrics(db: Session = Depends(get_db)):
    patients = db.query(Patient).all()
    
    total = len(patients)
    high_risk = 0
    pa_req_count = 0
    missing_docs = 0
    total_saved_minutes = 0
    
    for p in patients:
        if p.analysis:
            analysis = DetailedAnalysisResponse(**json.loads(p.analysis.analysis_json))
            if analysis.initial_denial_risk == "High":
                high_risk += 1
            if analysis.prior_authorization_required:
                pa_req_count += 1
            missing_docs += len(analysis.missing_documents)
            total_saved_minutes += analysis.estimated_time_saved_minutes
            
    # Estimate parameters
    time_saved_hours = round(total_saved_minutes / 60, 1)
    
    # Average denial risk reduction estimation
    total_reduction = 0
    active_analyses = 0
    for p in patients:
        if p.analysis:
            analysis = DetailedAnalysisResponse(**json.loads(p.analysis.analysis_json))
            total_reduction += analysis.estimated_risk_reduction_percent
            active_analyses += 1
            
    avg_reduction = round(total_reduction / active_analyses, 1) if active_analyses > 0 else 0.0

    return DashboardMetricsResponse(
        total_patients=total,
        high_risk_cases=high_risk,
        prior_auth_required_count=pa_req_count,
        missing_documents_count=missing_docs,
        estimated_time_saved_hours=time_saved_hours,
        estimated_delay_avoided_days=total * 3,  # average 3 days saved per patient case
        estimated_denial_risk_reduction_pct=avg_reduction
    )

# 7. GET /api/payer-policies: Get mock policies list
@app.get("/api/payer-policies", response_model=List[PayerPolicyResponse])
def read_payer_policies(db: Session = Depends(get_db)):
    policies = db.query(PayerPolicy).all()
    return [
        PayerPolicyResponse(
            id=p.id,
            plan_name=p.plan_name,
            procedure=p.procedure,
            prior_auth_required=p.prior_auth_required,
            required_documents=json.loads(p.required_documents),
            conservative_treatment_required=p.conservative_treatment_required,
            eligibility_required=p.eligibility_required,
            referral_required=p.referral_required,
            policy_summary=p.policy_summary,
            mock_source_reference=p.mock_source_reference
        )
        for p in policies
    ]

# 8. GET /api/audit-log: Get global audit log list
@app.get("/api/audit-log", response_model=List[AuditLogResponse])
def read_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
    
    results = []
    for l in logs:
        # Join query to fetch patient name for clarity
        results.append(
            AuditLogResponse(
                id=l.id,
                patient_id=l.patient_id,
                patient_name=l.patient.name,
                action=l.action,
                details=l.details,
                timestamp=l.timestamp.isoformat()
            )
        )
    return results
