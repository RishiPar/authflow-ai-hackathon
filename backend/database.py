import json
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from payer_policies import MOCK_POLICIES

DATABASE_URL = "sqlite:///./mock_cases.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    age = Column(Integer, nullable=False)
    symptoms = Column(String, nullable=False)
    symptoms_duration_weeks = Column(Integer, nullable=False)
    referral_status = Column(String, default="None")  # "Justified", "Incomplete", "None", "N/A"
    status = Column(String, default="Needs Documentation") # "Ready to Submit", "Needs Documentation", "Needs Eligibility Verification", "High Risk", "Human Review Required"
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    insurance = relationship("InsuranceInfo", back_populates="patient", uselist=False, cascade="all, delete-orphan")
    procedure_request = relationship("ProcedureRequest", back_populates="patient", uselist=False, cascade="all, delete-orphan")
    documents = relationship("PatientDocuments", back_populates="patient", uselist=False, cascade="all, delete-orphan")
    analysis = relationship("AnalysisResult", back_populates="patient", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="patient", cascade="all, delete-orphan")

class InsuranceInfo(Base):
    __tablename__ = "insurance_info"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    provider = Column(String, nullable=False)
    plan_type = Column(String, nullable=False)  # "Commercial PPO", "Medicare Advantage Mock Plan", "Medicaid Mock Managed Care", "Self-Pay / Unverified"
    eligibility_verified = Column(Boolean, default=False)

    patient = relationship("Patient", back_populates="insurance")

class ProcedureRequest(Base):
    __tablename__ = "procedure_requests"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    procedure_name = Column(String, nullable=False)  # "Lumbar Spine MRI", "Knee MRI", etc.
    diagnosis_code = Column(String, nullable=True)

    patient = relationship("Patient", back_populates="procedure_request")

class PatientDocuments(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    
    # Document checkboxes
    insurance_card = Column(Boolean, default=False)
    eligibility_verification = Column(Boolean, default=False)
    physician_order = Column(Boolean, default=False)
    diagnosis_code_doc = Column(Boolean, default=False)
    clinical_notes = Column(Boolean, default=False)
    referral = Column(Boolean, default=False)
    conservative_treatment = Column(Boolean, default=False)
    physical_therapy_notes = Column(Boolean, default=False)
    prior_auth_form = Column(Boolean, default=False)
    payer_policy_reference = Column(Boolean, default=False)

    patient = relationship("Patient", back_populates="documents")

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    initial_risk_score = Column(Integer, default=0)
    initial_denial_risk = Column(String, default="Low") # "High", "Medium", "Low"
    projected_risk_score = Column(Integer, default=0)
    projected_denial_risk = Column(String, default="Low")
    analysis_json = Column(Text, nullable=False)

    patient = relationship("Patient", back_populates="analysis")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    action = Column(String, nullable=False)
    details = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="audit_logs")

class PayerPolicy(Base):
    __tablename__ = "payer_policies"

    id = Column(Integer, primary_key=True, index=True)
    plan_name = Column(String, nullable=False)
    procedure = Column(String, nullable=False)
    prior_auth_required = Column(Boolean, default=True)
    required_documents = Column(Text, nullable=False)  # JSON list string
    conservative_treatment_required = Column(Boolean, default=False)
    eligibility_required = Column(Boolean, default=True)
    referral_required = Column(Boolean, default=False)
    policy_summary = Column(Text, nullable=False)
    mock_source_reference = Column(String, nullable=False)

# Init DB Tables
def init_db():
    Base.metadata.create_all(bind=engine)

# Seed Initial Mock Policies and Patients
def seed_mock_data():
    db = SessionLocal()
    try:
        # 1. Seed Payer Policies
        if db.query(PayerPolicy).count() == 0:
            for p in MOCK_POLICIES:
                policy = PayerPolicy(
                    plan_name=p["plan_name"],
                    procedure=p["procedure"],
                    prior_auth_required=p["prior_auth_required"],
                    required_documents=json.dumps(p["required_documents"]),
                    conservative_treatment_required=p["conservative_treatment_required"],
                    eligibility_required=p["eligibility_required"],
                    referral_required=p["referral_required"],
                    policy_summary=p["policy_summary"],
                    mock_source_reference=p["mock_source_reference"]
                )
                db.add(policy)
            db.commit()

        # 2. Seed Mock Patients
        if db.query(Patient).count() == 0:
            # Maria Lopez
            p1 = Patient(name="Maria Lopez", age=46, symptoms="Lower back pain for 8 weeks", symptoms_duration_weeks=8, referral_status="Incomplete", status="High Risk")
            db.add(p1)
            db.commit()
            db.refresh(p1)
            
            db.add(InsuranceInfo(patient_id=p1.id, provider="BlueCross Mock PPO", plan_type="Commercial PPO", eligibility_verified=False))
            db.add(ProcedureRequest(patient_id=p1.id, procedure_name="Lumbar Spine MRI", diagnosis_code=None))
            db.add(PatientDocuments(patient_id=p1.id, insurance_card=True)) # Only insurance card provided
            db.add(AuditLog(patient_id=p1.id, action="Patient intake submitted", details="Maria Lopez, Age 46, Lumbar Spine MRI requested."))
            
            # James Carter
            p2 = Patient(name="James Carter", age=59, symptoms="Knee pain after injury for 4 weeks", symptoms_duration_weeks=4, referral_status="N/A", status="Needs Documentation")
            db.add(p2)
            db.commit()
            db.refresh(p2)
            
            db.add(InsuranceInfo(patient_id=p2.id, provider="Medicare Advantage Mock Plan", plan_type="Medicare Advantage Mock Plan", eligibility_verified=True))
            db.add(ProcedureRequest(patient_id=p2.id, procedure_name="Knee MRI", diagnosis_code="M25.56"))
            db.add(PatientDocuments(patient_id=p2.id, insurance_card=True, physician_order=True, diagnosis_code_doc=True))
            db.add(AuditLog(patient_id=p2.id, action="Patient intake submitted", details="James Carter, Age 59, Knee MRI requested. Diagnosis: M25.56."))
            db.add(AuditLog(patient_id=p2.id, action="Eligibility verified", details="Active status confirmed for Medicare Advantage Mock Plan."))

            # Aisha Patel
            p3 = Patient(name="Aisha Patel", age=38, symptoms="Shoulder pain for 10 weeks", symptoms_duration_weeks=10, referral_status="N/A", status="Needs Eligibility Verification")
            db.add(p3)
            db.commit()
            db.refresh(p3)
            
            db.add(InsuranceInfo(patient_id=p3.id, provider="Medicaid Mock Managed Care", plan_type="Medicaid Mock Managed Care", eligibility_verified=False))
            db.add(ProcedureRequest(patient_id=p3.id, procedure_name="Shoulder MRI", diagnosis_code="M75.10"))
            db.add(PatientDocuments(patient_id=p3.id, physician_order=True, diagnosis_code_doc=True, clinical_notes=True, conservative_treatment=True))
            db.add(AuditLog(patient_id=p3.id, action="Patient intake submitted", details="Aisha Patel, Age 38, Shoulder MRI requested. Diagnosis: M75.10."))

            # Robert Nguyen
            p4 = Patient(name="Robert Nguyen", age=51, symptoms="Back pain for 12 weeks", symptoms_duration_weeks=12, referral_status="N/A", status="Ready to Submit")
            db.add(p4)
            db.commit()
            db.refresh(p4)
            
            db.add(InsuranceInfo(patient_id=p4.id, provider="UnitedCare Mock Commercial", plan_type="Commercial PPO", eligibility_verified=True))
            db.add(ProcedureRequest(patient_id=p4.id, procedure_name="Lumbar Spine MRI", diagnosis_code="M54.5"))
            db.add(PatientDocuments(
                patient_id=p4.id, 
                insurance_card=True, 
                eligibility_verification=True,
                physician_order=True, 
                diagnosis_code_doc=True, 
                clinical_notes=True, 
                conservative_treatment=True, 
                physical_therapy_notes=True
            ))
            db.add(AuditLog(patient_id=p4.id, action="Patient intake submitted", details="Robert Nguyen, Age 51, Lumbar Spine MRI requested."))
            db.add(AuditLog(patient_id=p4.id, action="Eligibility verified", details="Active status confirmed for UnitedCare Mock Commercial."))

            # Elena Garcia
            p5 = Patient(name="Elena Garcia", age=44, symptoms="Neck pain for 6 weeks", symptoms_duration_weeks=6, referral_status="Incomplete", status="High Risk")
            db.add(p5)
            db.commit()
            db.refresh(p5)
            
            db.add(InsuranceInfo(patient_id=p5.id, provider="Self-Pay / Unverified Insurance", plan_type="Self-Pay / Unverified Insurance", eligibility_verified=False))
            db.add(ProcedureRequest(patient_id=p5.id, procedure_name="Cervical Spine MRI", diagnosis_code=None))
            db.add(PatientDocuments(patient_id=p5.id)) # No documents
            db.add(AuditLog(patient_id=p5.id, action="Patient intake submitted", details="Elena Garcia, Age 44, Cervical Spine MRI requested."))

            db.commit()
    finally:
        db.close()
