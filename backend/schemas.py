from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Document checkboxes state mapping
class DocumentState(BaseModel):
    insurance_card: bool = False
    eligibility_verification: bool = False
    physician_order: bool = False
    diagnosis_code_doc: bool = False
    clinical_notes: bool = False
    referral: bool = False
    conservative_treatment: bool = False
    physical_therapy_notes: bool = False
    prior_auth_form: bool = False
    payer_policy_reference: bool = False

# Payload for document update PATCH
class DocumentUpdate(BaseModel):
    insurance_card: Optional[bool] = None
    eligibility_verification: Optional[bool] = None
    physician_order: Optional[bool] = None
    diagnosis_code_doc: Optional[bool] = None
    clinical_notes: Optional[bool] = None
    referral: Optional[bool] = None
    conservative_treatment: Optional[bool] = None
    physical_therapy_notes: Optional[bool] = None
    prior_auth_form: Optional[bool] = None
    payer_policy_reference: Optional[bool] = None

class IntakeCreate(BaseModel):
    patient_name: str
    age: int
    symptoms: str
    symptoms_duration_weeks: int
    requested_procedure: str
    insurance_provider: str
    insurance_plan_type: str = "Commercial PPO"
    referral_status: str = "None"  # "Justified", "Incomplete", "None", "N/A"
    diagnosis_code: Optional[str] = None
    documents_provided: DocumentState = Field(default_factory=DocumentState)

class PatientUpdate(IntakeCreate):
    pass

# Detailed items in risk factor list
class RiskFactorDetail(BaseModel):
    factor_name: str
    points_added: int
    reason: str
    recommended_fix: str

# New Comprehensive Analysis Schema matching requested format
class DetailedAnalysisResponse(BaseModel):
    patient_id: int
    patient_name: str
    prior_authorization_required: bool
    payer_policy_summary: str
    initial_risk_score: int
    initial_denial_risk: str
    risk_factors: List[RiskFactorDetail]
    missing_documents: List[str]
    recommended_actions: List[str]
    projected_risk_after_actions: int
    estimated_risk_reduction_percent: int
    estimated_time_saved_minutes: int
    estimated_delay_avoided_days: str
    risk_averted_summary: str
    confidence_level: str  # "High", "Medium", "Low"
    human_review_required: bool
    safety_notes: str
    disclaimer: str

class PatientResponse(BaseModel):
    id: int
    name: str
    age: int
    symptoms: str
    symptoms_duration_weeks: int
    referral_status: str
    status: str
    provider: str
    plan_type: str
    eligibility_verified: bool
    procedure_name: str
    diagnosis_code: Optional[str]
    documents: DocumentState
    analysis: Optional[DetailedAnalysisResponse] = None
    created_at: str

class DashboardMetricsResponse(BaseModel):
    total_patients: int
    high_risk_cases: int
    prior_auth_required_count: int
    missing_documents_count: int
    estimated_time_saved_hours: float
    estimated_delay_avoided_days: int
    estimated_denial_risk_reduction_pct: float

class PayerPolicyResponse(BaseModel):
    id: int
    plan_name: str
    procedure: str
    prior_auth_required: bool
    required_documents: List[str]
    conservative_treatment_required: bool
    eligibility_required: bool
    referral_required: bool
    policy_summary: str
    mock_source_reference: str

class AuditLogResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: str
    action: str
    details: str
    timestamp: str

class AnalyzeRequest(BaseModel):
    patient_id: int
