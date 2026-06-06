MOCK_POLICIES = [
    {
        "plan_name": "BlueCross Mock PPO",
        "procedure": "Lumbar Spine MRI",
        "prior_auth_required": True,
        "required_documents": [
            "Physician order",
            "Diagnosis code",
            "Conservative treatment documentation",
            "Physical therapy notes",
            "Referral"
        ],
        "conservative_treatment_required": True,
        "eligibility_required": True,
        "referral_required": True,
        "policy_summary": "Requires prior authorization for Lumbar Spine MRI when symptoms have lasted more than 6 weeks. Documented conservative treatment (like physical therapy notes) and referral justification are required to avoid delay.",
        "mock_source_reference": "BlueCross Mock PPO Lumbar Spine MRI Policy - Mock Ref: BC-LBP-004"
    },
    {
        "plan_name": "Medicare Advantage Mock Plan",
        "procedure": "Knee MRI",
        "prior_auth_required": True,
        "required_documents": [
            "Physician order",
            "Diagnosis code",
            "Clinical notes",
            "Conservative treatment documentation"
        ],
        "conservative_treatment_required": True,
        "eligibility_required": True,
        "referral_required": False,
        "policy_summary": "Prior authorization is required for Knee MRI. Must document conservative treatment (such as brace or NSAIDs) and submit clinical evaluation notes.",
        "mock_source_reference": "Medicare Advantage Mock Plan Joint MRI Policy - Mock Ref: MA-KNEE-9982"
    },
    {
        "plan_name": "Medicaid Mock Managed Care",
        "procedure": "Shoulder MRI",
        "prior_auth_required": True,
        "required_documents": [
            "Physician order",
            "Diagnosis code",
            "Clinical notes",
            "Conservative treatment documentation",
            "Eligibility verification",
            "Prior authorization form"
        ],
        "conservative_treatment_required": True,
        "eligibility_required": True,
        "referral_required": False,
        "policy_summary": "Medicaid managed care mandates strict prior authorization, pre-submission eligibility verification, physician order, diagnosis code, and conservative treatment documentation.",
        "mock_source_reference": "Medicaid Mock Managed Care Shoulder MRI Policy - Mock Ref: MED-SHOULDER-2026A"
    },
    {
        "plan_name": "UnitedCare Mock Commercial",
        "procedure": "Lumbar Spine MRI",
        "prior_auth_required": True,
        "required_documents": [
            "Physician order",
            "Diagnosis code",
            "Conservative treatment documentation",
            "Physical therapy notes"
        ],
        "conservative_treatment_required": True,
        "eligibility_required": True,
        "referral_required": False,
        "policy_summary": "Commercial coverage for lumbar spine MRI requires physician order, diagnosis code, and evidence of at least 6 weeks of conservative treatment (PT notes).",
        "mock_source_reference": "UnitedCare Mock Commercial Lumbar MRI Policy - Mock Ref: UC-LUMBAR-PPO"
    }
]
