from typing import List, Dict, Any, Tuple
from schemas import DetailedAnalysisResponse, RiskFactorDetail, DocumentState
from payer_policies import MOCK_POLICIES

DISCLAIMER_TEXT = "AuthFlow AI does not provide medical advice, determine final insurance coverage, guarantee payer approval, or replace staff review."

def find_policy(provider: str, procedure: str) -> Dict[str, Any]:
    # Look for matching policy
    for p in MOCK_POLICIES:
        if p["plan_name"].lower() in provider.lower() and p["procedure"].lower() in procedure.lower():
            return p
    # Fallback default mock rules
    return {
        "plan_name": provider,
        "procedure": procedure,
        "prior_auth_required": True,
        "required_documents": ["Physician order", "Diagnosis code", "Clinical notes"],
        "conservative_treatment_required": False,
        "eligibility_required": True,
        "referral_required": False,
        "policy_summary": f"Prior authorization review standard guidelines for {procedure} under plan {provider}.",
        "mock_source_reference": "Standard Policy - Ref: STD-GEN-2026"
    }

def calculate_factors(
    patient_name: str,
    age: int,
    symptoms_duration_weeks: int,
    provider: str,
    plan_type: str,
    procedure: str,
    diagnosis_code: str,
    referral_status: str,
    eligibility_verified: bool,
    docs: DocumentState,
    assume_all_docs: bool = False
) -> Tuple[int, List[RiskFactorDetail], List[str]]:
    
    score = 0
    factors = []
    missing_docs = []
    
    policy = find_policy(provider, procedure)
    required_docs = policy["required_documents"]
    
    # helper check function
    def has_doc(doc_name: str) -> bool:
        if assume_all_docs:
            return True
            
        doc_key = doc_name.lower().replace(" ", "_")
        # Handle maps/abbreviations
        if "order" in doc_key:
            return docs.physician_order
        elif "code" in doc_key:
            return docs.diagnosis_code_doc
        elif "notes" in doc_key and "therapy" in doc_key:
            return docs.physical_therapy_notes
        elif "notes" in doc_key:
            return docs.clinical_notes
        elif "conservative" in doc_key:
            return docs.conservative_treatment
        elif "referral" in doc_key:
            return docs.referral
        elif "card" in doc_key:
            return docs.insurance_card
        elif "verification" in doc_key:
            return docs.eligibility_verification or eligibility_verified
        elif "form" in doc_key:
            return docs.prior_auth_form
        elif "reference" in doc_key:
            return docs.payer_policy_reference
        return False

    # 1. Prior Auth Required Check
    pa_req = policy["prior_auth_required"]
    if pa_req and plan_type != "Self-Pay / Unverified Insurance":
        score += 15
        factors.append(RiskFactorDetail(
            factor_name="Prior Authorization Required",
            points_added=15,
            reason="Payer requires prior authorization for this high-cost service.",
            recommended_fix="Complete authorization checklist prior to imaging appointment."
        ))

    # Check required documents and add points if missing
    for doc in required_docs:
        present = has_doc(doc)
        if not present:
            missing_docs.append(doc)
            
            # Map missing documents to score points
            doc_lower = doc.lower()
            if "order" in doc_lower:
                score += 20
                factors.append(RiskFactorDetail(
                    factor_name="Missing Physician Order",
                    points_added=20,
                    reason="A signed physician order is required for this procedure.",
                    recommended_fix="Request a signed order from the referring provider."
                ))
            elif "code" in doc_lower:
                score += 15
                factors.append(RiskFactorDetail(
                    factor_name="Missing Diagnosis Code",
                    points_added=15,
                    reason="CPT code must match an approved diagnostic criteria code.",
                    recommended_fix="Obtain valid ICD-10 diagnosis code from the clinic."
                ))
            elif "therapy" in doc_lower:
                score += 10
                factors.append(RiskFactorDetail(
                    factor_name="Missing Physical Therapy Notes",
                    points_added=10,
                    reason="Payer requires physical therapy logs to prove conservative treatment failure.",
                    recommended_fix="Contact physical therapy clinic to request treatment logs."
                ))
            elif "conservative" in doc_lower:
                score += 20
                factors.append(RiskFactorDetail(
                    factor_name="Missing Conservative Treatment Documentation",
                    points_added=20,
                    reason="No conservative therapy trials (medications, brace, injections) documented.",
                    recommended_fix="Compile clinical history details on conservative management."
                ))
            elif "notes" in doc_lower:
                score += 15
                factors.append(RiskFactorDetail(
                    factor_name="Missing Clinical Notes",
                    points_added=15,
                    reason="Initial consult clinical evaluation and progress notes are missing.",
                    recommended_fix="Request consultation clinical notes from the orthopedist."
                ))
            elif "referral" in doc_lower:
                score += 15
                factors.append(RiskFactorDetail(
                    factor_name="Missing Referral Justification",
                    points_added=15,
                    reason="Payer mandates referral justification for specialist imaging.",
                    recommended_fix="Submit primary care physician referral justification notes."
                ))

    # 8. Eligibility Verification
    el_verified = eligibility_verified or (has_doc("Eligibility verification") if not assume_all_docs else True)
    if not el_verified:
        score += 20
        factors.append(RiskFactorDetail(
            factor_name="Insurance Eligibility Unverified",
            points_added=20,
            reason="Patient active coverage status has not been confirmed.",
            recommended_fix="Run eligibility check via payer EDI clearinghouse portal."
        ))

    # 9. Plan Type Unknown
    if plan_type == "Self-Pay / Unverified Insurance" or not plan_type:
        score += 15
        factors.append(RiskFactorDetail(
            factor_name="Insurance Plan Type Unknown",
            points_added=15,
            reason="Insurance plan details or policy boundaries are undefined.",
            recommended_fix="Verify insurance card and details with patient."
        ))

    # 10. Medicaid Managed Care Plan Not Confirmed
    if plan_type == "Medicaid Mock Managed Care" and not el_verified:
        score += 15
        factors.append(RiskFactorDetail(
            factor_name="Medicaid Managed Care Unconfirmed",
            points_added=15,
            reason="Medicaid managed care plan assignment needs verification.",
            recommended_fix="Confirm active managed care organization enrollment on state Medicaid site."
        ))

    # 11. Symptoms Duration below threshold
    dur_threshold = 6
    if "Knee" in procedure:
        dur_threshold = 4
    elif "Shoulder" in procedure:
        dur_threshold = 8

    if symptoms_duration_weeks <= dur_threshold:
        score += 10
        factors.append(RiskFactorDetail(
            factor_name="Symptom Duration Below Requirement",
            points_added=10,
            reason=f"Symptom duration of {symptoms_duration_weeks} weeks is below the payer policy minimum of {dur_threshold} weeks.",
            recommended_fix="Verify clinical onset notes or request medical necessity exception details."
        ))

    # 12. High Cost imaging
    if "MRI" in procedure or "CT" in procedure:
        score += 15
        factors.append(RiskFactorDetail(
            factor_name="High-Cost Imaging Procedure",
            points_added=15,
            reason="MRI procedures trigger administrative prior authorization reviews.",
            recommended_fix="Audit clinical file using pre-authorization checklist."
        ))

    # 13. Payer policy requires documentation
    if len(required_docs) >= 3:
        score += 15
        factors.append(RiskFactorDetail(
            factor_name="Payer Policy Documentation Mandate",
            points_added=15,
            reason="Insurer has strict document verification rules for spine/joint scans.",
            recommended_fix="Follow staff checklist thoroughly before submitting claim."
        ))

    final_score = min(score, 100)
    return final_score, factors, missing_docs

def evaluate_weighted_rules(patient_id: int, db_patient: Any) -> DetailedAnalysisResponse:
    # Extract info from DB objects
    patient_name = db_patient.name
    age = db_patient.age
    symptoms_duration_weeks = db_patient.symptoms_duration_weeks
    provider = db_patient.insurance.provider
    plan_type = db_patient.insurance.plan_type
    procedure = db_patient.procedure_request.procedure_name
    diagnosis_code = db_patient.procedure_request.diagnosis_code or ""
    referral_status = db_patient.referral_status
    eligibility_verified = db_patient.insurance.eligibility_verified
    docs_state = db_patient.documents
    
    # Map model DB to Pydantic DocumentState
    docs = DocumentState(
        insurance_card=docs_state.insurance_card,
        eligibility_verification=docs_state.eligibility_verification,
        physician_order=docs_state.physician_order,
        diagnosis_code_doc=docs_state.diagnosis_code_doc,
        clinical_notes=docs_state.clinical_notes,
        referral=docs_state.referral,
        conservative_treatment=docs_state.conservative_treatment,
        physical_therapy_notes=docs_state.physical_therapy_notes,
        prior_auth_form=docs_state.prior_auth_form,
        payer_policy_reference=docs_state.payer_policy_reference
    )

    # 1. Calculate Initial Score
    initial_score, risk_factors, missing_documents = calculate_factors(
        patient_name, age, symptoms_duration_weeks, provider, plan_type, procedure, 
        diagnosis_code, referral_status, eligibility_verified, docs, assume_all_docs=False
    )
    
    # Determine risk category
    if initial_score <= 30:
        initial_risk = "Low"
    elif initial_score <= 65:
        initial_risk = "Medium"
    else:
        initial_risk = "High"

    # 2. Calculate Projected Score (assuming all checklist items are uploaded and verified)
    projected_score, _, _ = calculate_factors(
        patient_name, age, symptoms_duration_weeks, provider, plan_type, procedure, 
        diagnosis_code, referral_status, eligibility_verified, docs, assume_all_docs=True
    )
    
    # 3. Recommendations
    actions = []
    if not eligibility_verified and not docs.eligibility_verification:
        actions.append("Verify insurance card and check active coverage eligibility via clearinghouse.")
    
    policy = find_policy(provider, procedure)
    pa_required = policy["prior_auth_required"]
    
    if pa_required:
        actions.append("Confirm prior authorization requirement is active with BlueCross/UnitedCare.")
        
    for doc in missing_documents:
        actions.append(f"Request missing {doc.lower()} from referring provider or primary physician.")
        
    actions.append("Submit authorization packet ONLY after comprehensive clinical and staff peer review.")

    # 4. Impact metrics
    estimated_time_saved = 15 + (len(missing_documents) * 5)  # 15 minutes base + 5 mins per caught document
    delay_avoided = "3–5 Business Days" if len(missing_documents) > 2 else "1–2 Business Days"
    risk_reduction_pct = max(0, initial_score - projected_score)

    # 5. Confidence logic
    if not eligibility_verified or plan_type == "Self-Pay / Unverified Insurance":
        confidence = "Low"
    elif len(missing_documents) > 2:
        confidence = "Medium"
    else:
        confidence = "High"

    # Payer policy summary
    policy_summary = policy["policy_summary"]
    
    # Safety notes
    safety_notes = "Grounded analysis based on mock payer policy. System does not make medical diagnosis predictions."

    return DetailedAnalysisResponse(
        patient_id=patient_id,
        patient_name=patient_name,
        prior_authorization_required=pa_required,
        payer_policy_summary=policy_summary,
        initial_risk_score=initial_score,
        initial_denial_risk=initial_risk,
        risk_factors=risk_factors,
        missing_documents=missing_documents,
        recommended_actions=actions,
        projected_risk_after_actions=projected_score,
        estimated_risk_reduction_percent=risk_reduction_pct,
        estimated_time_saved_minutes=estimated_time_saved,
        estimated_delay_avoided_days=delay_avoided,
        risk_averted_summary=f"Prevented submission with {len(missing_documents)} missing documents. Projected risk drop of {risk_reduction_pct} points.",
        confidence_level=confidence,
        human_review_required=True,
        safety_notes=safety_notes,
        disclaimer=DISCLAIMER_TEXT
    )
