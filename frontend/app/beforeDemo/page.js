"use client";

import { useState } from "react";

// Mimics the look and feel of Epic/Cerner style hospital software
// Intentionally dense, repetitive, and painful — that's the point

export default function BeforePage() {
  const [tab, setTab] = useState("demographics");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert("NOTICE: Form saved to local draft. Remember to also re-enter this information into the Prior Auth portal, the Billing System, and the Scheduling System separately.");
    }, 1200);
  };

  const tabs = [
    { id: "demographics", label: "Patient Demographics" },
    { id: "insurance", label: "Insurance / Coverage" },
    { id: "clinical", label: "Clinical Information" },
    { id: "auth", label: "Prior Authorization" },
    { id: "billing", label: "Billing & Coding" },
  ];

  return (
    <div style={{ fontFamily: "'Courier New', monospace", background: "#d4d0c8", minHeight: "100vh", fontSize: "12px", color: "#000" }}>

      {/* Epic-style title bar */}
      <div style={{ background: "#003366", color: "white", padding: "4px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontWeight: "bold", fontSize: "13px", letterSpacing: "1px" }}>EPIC SYSTEMS — HYPERSPACE 2024</span>
          <span style={{ fontSize: "11px", opacity: 0.7 }}>Patient Intake Workbench v8.3.1</span>
        </div>
        <div style={{ display: "flex", gap: "12px", fontSize: "11px", alignItems: "center" }}>
          <span>User: JSMITH_ADMIN</span>
          <span>|</span>
          <span>Dept: FRONT DESK — ORTHOPEDICS</span>
          <span>|</span>
          <span style={{ color: "#ffcc00" }}>! 14 pending items</span>
          <span style={{ marginLeft: "8px", borderLeft: "1px solid rgba(255,255,255,0.3)", paddingLeft: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)" }}>Traditional</span>
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "rgba(255,255,255,0.2)",
                borderRadius: "999px",
                padding: "2px 3px",
                width: "40px",
                textDecoration: "none",
                position: "relative",
              }}
              title="Switch to AuthFlow AI"
            >
              <span style={{
                display: "inline-block",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "white",
                opacity: 0.5,
                marginLeft: "0px",
              }} />
            </a>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>AuthFlow AI</span>
          </span>
        </div>
      </div>

      {/* Warning banner */}
      <div style={{ background: "#fff3cd", border: "1px solid #ffc107", padding: "4px 12px", fontSize: "11px", display: "flex", gap: "16px", alignItems: "center" }}>
        <span style={{ color: "#856404", fontWeight: "bold" }}>NOTICE:</span>
        <span style={{ color: "#856404" }}>This form must be completed in full before prior authorization can be submitted. Fields marked * are required. Information entered here does NOT automatically transfer to the billing or scheduling systems.</span>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: "960px", margin: "8px auto", padding: "0 8px" }}>

        {/* Patient header bar */}
        <div style={{ background: "#003366", color: "white", padding: "6px 10px", display: "flex", gap: "24px", alignItems: "center", marginBottom: "4px" }}>
          <div>
            <span style={{ fontSize: "10px", opacity: 0.7 }}>PATIENT NAME</span>
            <div style={{ fontWeight: "bold", fontSize: "13px" }}>[ NEW PATIENT ]</div>
          </div>
          <div>
            <span style={{ fontSize: "10px", opacity: 0.7 }}>MRN</span>
            <div style={{ fontWeight: "bold" }}>PENDING ASSIGNMENT</div>
          </div>
          <div>
            <span style={{ fontSize: "10px", opacity: 0.7 }}>DOB</span>
            <div style={{ fontWeight: "bold" }}>—</div>
          </div>
          <div>
            <span style={{ fontSize: "10px", opacity: 0.7 }}>ENCOUNTER TYPE</span>
            <div style={{ fontWeight: "bold" }}>OUTPATIENT — IMAGING</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: "11px", opacity: 0.8 }}>
            Form last saved: Never &nbsp;|&nbsp; Status: <span style={{ color: "#ffcc00" }}>DRAFT</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "2px solid #003366", marginBottom: "0" }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "5px 14px",
                background: tab === t.id ? "#003366" : "#b8b4a8",
                color: tab === t.id ? "white" : "#333",
                border: "1px solid #888",
                borderBottom: tab === t.id ? "none" : "1px solid #888",
                cursor: "pointer",
                fontSize: "11px",
                fontFamily: "'Courier New', monospace",
                fontWeight: tab === t.id ? "bold" : "normal",
                marginRight: "2px",
                marginBottom: tab === t.id ? "-2px" : "0",
              }}
            >
              {t.label}
              {t.id !== "demographics" && <span style={{ color: "#cc0000", marginLeft: "4px" }}>*</span>}
            </button>
          ))}
        </div>

        {/* Form body */}
        <div style={{ background: "#f0ede8", border: "1px solid #999", padding: "12px", minHeight: "480px" }}>

          {tab === "demographics" && (
            <div>
              <SectionHeader title="SECTION 1 OF 5 — PATIENT DEMOGRAPHICS" subtitle="All fields required. Must be re-entered if patient already exists in system." />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                <Field label="Last Name *" />
                <Field label="First Name *" />
                <Field label="Middle Name" />
                <Field label="Date of Birth *" placeholder="MM/DD/YYYY" />
                <Field label="SSN (Last 4) *" placeholder="XXXX" />
                <Field label="Gender *" type="select" options={["-- Select --", "Male", "Female", "Other", "Unknown"]} />
                <Field label="Race *" type="select" options={["-- Select --", "White", "Black/African American", "Asian", "Hispanic", "Other", "Decline to State"]} />
                <Field label="Ethnicity *" type="select" options={["-- Select --", "Hispanic or Latino", "Not Hispanic or Latino", "Unknown"]} />
                <Field label="Preferred Language *" type="select" options={["-- Select --", "English", "Spanish", "Mandarin", "Other"]} />
              </div>
              <SectionDivider title="Contact Information" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                <Field label="Home Address Line 1 *" />
                <Field label="Home Address Line 2" />
                <Field label="City *" />
                <Field label="State *" type="select" options={["-- Select --", "TX", "CA", "NY", "FL"]} />
                <Field label="ZIP Code *" />
                <Field label="County" />
                <Field label="Home Phone" placeholder="(XXX) XXX-XXXX" />
                <Field label="Cell Phone *" placeholder="(XXX) XXX-XXXX" />
                <Field label="Work Phone" placeholder="(XXX) XXX-XXXX" />
                <Field label="Email Address" />
                <Field label="Preferred Contact Method *" type="select" options={["-- Select --", "Home Phone", "Cell Phone", "Email", "Mail"]} />
                <Field label="OK to Leave Voicemail? *" type="select" options={["-- Select --", "Yes", "No"]} />
              </div>
              <SectionDivider title="Emergency Contact" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <Field label="Emergency Contact Name *" />
                <Field label="Relationship *" type="select" options={["-- Select --", "Spouse", "Parent", "Child", "Sibling", "Friend", "Other"]} />
                <Field label="Emergency Contact Phone *" placeholder="(XXX) XXX-XXXX" />
              </div>
              <div style={{ marginTop: "12px", padding: "8px", background: "#fff3cd", border: "1px solid #ffc107", fontSize: "11px", color: "#856404" }}>
                NOTE: After completing Demographics, you must also enter this patient into the <strong>Scheduling System (Cadence)</strong> and the <strong>Patient Portal (MyChart)</strong> separately. This form does not sync automatically.
              </div>
            </div>
          )}

          {tab === "insurance" && (
            <div>
              <SectionHeader title="SECTION 2 OF 5 — INSURANCE & COVERAGE VERIFICATION" subtitle="Enter primary and secondary insurance. Eligibility must be verified manually via payer portal." />
              <SectionDivider title="Primary Insurance" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                <Field label="Insurance Company Name *" />
                <Field label="Plan Name *" />
                <Field label="Plan Type *" type="select" options={["-- Select --", "Commercial PPO", "Commercial HMO", "Medicare", "Medicaid", "Medicare Advantage", "Self-Pay"]} />
                <Field label="Member ID *" />
                <Field label="Group Number *" />
                <Field label="Subscriber Name *" />
                <Field label="Subscriber DOB *" placeholder="MM/DD/YYYY" />
                <Field label="Subscriber Relationship *" type="select" options={["-- Select --", "Self", "Spouse", "Child", "Other"]} />
                <Field label="Effective Date *" placeholder="MM/DD/YYYY" />
                <Field label="Termination Date" placeholder="MM/DD/YYYY" />
                <Field label="Copay Amount" placeholder="$0.00" />
                <Field label="Deductible Amount" placeholder="$0.00" />
              </div>
              <div style={{ padding: "8px", background: "#e8f4e8", border: "1px solid #4caf50", fontSize: "11px", marginBottom: "12px" }}>
                <strong>REQUIRED:</strong> After entering insurance information, you must verify eligibility manually by logging into the payer portal or calling the payer directly at the number on the back of the insurance card. Eligibility verification results must be documented below.
              </div>
              <SectionDivider title="Eligibility Verification (Manual)" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                <Field label="Eligibility Verified? *" type="select" options={["-- Select --", "Yes — Active", "No — Inactive", "Unable to Verify", "Pending"]} />
                <Field label="Verification Method *" type="select" options={["-- Select --", "Payer Portal", "Phone Call", "EDI 270/271", "Fax"]} />
                <Field label="Verified By (Staff Name) *" />
                <Field label="Verification Date *" placeholder="MM/DD/YYYY" />
                <Field label="Verification Reference # " />
                <Field label="Prior Auth Required? *" type="select" options={["-- Select --", "Yes", "No", "Unknown"]} />
              </div>
              <SectionDivider title="Secondary Insurance (if applicable)" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <Field label="Secondary Insurance Company" />
                <Field label="Secondary Plan Name" />
                <Field label="Secondary Member ID" />
                <Field label="Secondary Group Number" />
                <Field label="Secondary Subscriber Name" />
                <Field label="Secondary Effective Date" placeholder="MM/DD/YYYY" />
              </div>
            </div>
          )}

          {tab === "clinical" && (
            <div>
              <SectionHeader title="SECTION 3 OF 5 — CLINICAL INFORMATION" subtitle="Must be completed by or in coordination with the ordering physician." />
              <SectionDivider title="Presenting Complaint & History" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                <Field label="Primary Complaint *" />
                <Field label="Onset Date *" placeholder="MM/DD/YYYY" />
                <Field label="Duration (Weeks) *" />
                <Field label="Symptom Severity (1-10) *" />
                <Field label="Location of Pain *" />
                <Field label="Radiation? *" type="select" options={["-- Select --", "Yes", "No"]} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontWeight: "bold", marginBottom: "3px", fontSize: "11px" }}>Description of Symptoms * <span style={{ color: "#cc0000" }}>(Required — min 50 characters)</span></label>
                <textarea style={{ width: "100%", height: "64px", border: "1px solid #888", fontFamily: "'Courier New', monospace", fontSize: "11px", padding: "4px", background: "white" }} placeholder="Describe symptoms in detail..." />
              </div>
              <SectionDivider title="Diagnosis & Procedure" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                <Field label="Primary ICD-10 Code *" placeholder="e.g. M54.5" />
                <Field label="ICD-10 Description *" />
                <Field label="Secondary ICD-10 Code" />
                <Field label="Requested Procedure *" type="select" options={["-- Select --", "Lumbar Spine MRI", "Cervical Spine MRI", "Knee MRI", "Shoulder MRI", "CT Scan"]} />
                <Field label="CPT Code *" placeholder="e.g. 72148" />
                <Field label="CPT Description *" />
                <Field label="Ordering Physician NPI *" />
                <Field label="Ordering Physician Name *" />
                <Field label="Ordering Physician Phone *" />
              </div>
              <SectionDivider title="Conservative Treatment History (Required for PA)" />
              <div style={{ padding: "8px", background: "#fff3cd", border: "1px solid #ffc107", fontSize: "11px", marginBottom: "8px", color: "#856404" }}>
                REQUIRED: Payer requires documentation of failed conservative treatment before approving imaging. List ALL prior treatments below. Attach supporting documentation separately in the Documents tab.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <Field label="Physical Therapy? *" type="select" options={["-- Select --", "Yes — Completed", "Yes — Ongoing", "No", "Refused"]} />
                <Field label="PT Duration (weeks)" />
                <Field label="PT Clinic Name" />
                <Field label="Medication Trial? *" type="select" options={["-- Select --", "Yes", "No"]} />
                <Field label="Medication Name(s)" />
                <Field label="Medication Duration" />
                <Field label="Injections? *" type="select" options={["-- Select --", "Yes", "No"]} />
                <Field label="Injection Type" />
                <Field label="Injection Date" placeholder="MM/DD/YYYY" />
              </div>
            </div>
          )}

          {tab === "auth" && (
            <div>
              <SectionHeader title="SECTION 4 OF 5 — PRIOR AUTHORIZATION REQUEST" subtitle="NOTE: This information must ALSO be manually re-entered into the payer's separate PA portal." />
              <div style={{ padding: "10px", background: "#f8d7da", border: "1px solid #f5c6cb", fontSize: "11px", marginBottom: "12px", color: "#721c24" }}>
                <strong>IMPORTANT:</strong> Completing this section does NOT submit the prior authorization. You must log into the payer's portal separately and re-enter all of this information. Typical payer portals: UHC = UHCprovider.com | BCBS = availity.com | Medicare = ngsmedicare.com
              </div>
              <SectionDivider title="Authorization Details" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                <Field label="Auth Request Date *" placeholder="MM/DD/YYYY" />
                <Field label="Requested Service Date *" placeholder="MM/DD/YYYY" />
                <Field label="Urgency *" type="select" options={["-- Select --", "Routine", "Urgent", "Emergent"]} />
                <Field label="Auth Type *" type="select" options={["-- Select --", "Initial Request", "Renewal", "Peer-to-Peer", "Appeals"]} />
                <Field label="Facility Name *" />
                <Field label="Facility NPI *" />
                <Field label="Facility Tax ID *" />
                <Field label="Place of Service Code *" type="select" options={["-- Select --", "11 - Office", "22 - Outpatient Hospital", "24 - Ambulatory Surgical Center"]} />
                <Field label="Units Requested *" />
              </div>
              <SectionDivider title="Clinical Justification (re-enter from Section 3)" />
              <div style={{ padding: "8px", background: "#fff3cd", border: "1px solid #ffc107", fontSize: "11px", marginBottom: "8px", color: "#856404" }}>
                NOTE: You must re-enter the clinical information from Section 3 here. The prior auth form requires a separate copy of this information.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                <Field label="Primary Diagnosis Code * (re-enter)" placeholder="Same as Section 3" />
                <Field label="Procedure Code * (re-enter)" placeholder="Same as Section 3" />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontWeight: "bold", marginBottom: "3px", fontSize: "11px" }}>Clinical Justification Notes * <span style={{ color: "#cc0000" }}>(Re-enter from clinical notes)</span></label>
                <textarea style={{ width: "100%", height: "80px", border: "1px solid #888", fontFamily: "'Courier New', monospace", fontSize: "11px", padding: "4px", background: "white" }} placeholder="Re-enter clinical justification..." />
              </div>
              <SectionDivider title="Required Documents Checklist" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                {["Signed Physician Order", "Clinical Notes", "Conservative Treatment Documentation", "Physical Therapy Notes", "Diagnosis Code Documentation", "Referral Letter", "Insurance Card Copy", "Eligibility Verification Letter", "Prior Auth Request Form (Payer Specific)", "Patient Consent Form"].map(doc => (
                  <label key={doc} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", padding: "4px 6px", background: "white", border: "1px solid #ccc" }}>
                    <input type="checkbox" />
                    <span>{doc}</span>
                    <span style={{ color: "#cc0000", marginLeft: "auto" }}>Must fax separately</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {tab === "billing" && (
            <div>
              <SectionHeader title="SECTION 5 OF 5 — BILLING & CODING" subtitle="Must be completed by certified medical coder. Do not leave blank." />
              <div style={{ padding: "8px", background: "#f8d7da", border: "1px solid #f5c6cb", fontSize: "11px", marginBottom: "12px", color: "#721c24" }}>
                <strong>REMINDER:</strong> This billing information must ALSO be manually entered into the billing system (Resolute). This form does not sync with Resolute automatically.
              </div>
              <SectionDivider title="Claim Information" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                <Field label="Bill Type *" type="select" options={["-- Select --", "131 - Outpatient", "141 - Other"]} />
                <Field label="Admission Type *" type="select" options={["-- Select --", "1 - Emergency", "2 - Urgent", "3 - Elective"]} />
                <Field label="Primary CPT Code *" placeholder="e.g. 72148" />
                <Field label="CPT Modifier 1" placeholder="e.g. 26" />
                <Field label="CPT Modifier 2" placeholder="e.g. TC" />
                <Field label="Revenue Code *" placeholder="e.g. 0320" />
                <Field label="Primary ICD-10-CM *" placeholder="e.g. M54.5" />
                <Field label="Secondary ICD-10-CM" />
                <Field label="Tertiary ICD-10-CM" />
                <Field label="Rendering Provider NPI *" />
                <Field label="Billing Provider NPI *" />
                <Field label="Referring Provider NPI" />
                <Field label="Facility NPI *" />
                <Field label="Facility Tax ID *" />
                <Field label="Place of Service *" type="select" options={["-- Select --", "11", "22", "24"]} />
              </div>
              <div style={{ padding: "10px", background: "#fff3cd", border: "1px solid #ffc107", fontSize: "11px", color: "#856404" }}>
                <strong>BEFORE SUBMITTING:</strong> Verify the following have been completed separately:
                <ul style={{ marginTop: "6px", paddingLeft: "16px", lineHeight: "1.8" }}>
                  <li>Prior Authorization submitted via payer portal </li>
                  <li>Eligibility verified via clearinghouse </li>
                  <li>Clinical documents faxed to payer </li>
                  <li>Patient demographics entered in Scheduling (Cadence) </li>
                  <li>Patient registered in MyChart </li>
                  <li>Claim entered in Resolute billing system </li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Bottom action bar */}
        <div style={{ background: "#d4d0c8", border: "1px solid #999", padding: "6px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
          <div style={{ fontSize: "11px", color: "#666" }}>
            Tab {tabs.findIndex(t => t.id === tab) + 1} of 5 &nbsp;|&nbsp; Required fields remaining: <span style={{ color: "#cc0000", fontWeight: "bold" }}>47</span>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <EpicButton label="← Previous" onClick={() => {
              const idx = tabs.findIndex(t => t.id === tab);
              if (idx > 0) setTab(tabs[idx - 1].id);
            }} />
            <EpicButton label="Save Draft" onClick={handleSave} primary={false} />
            <EpicButton label="Next →" onClick={() => {
              const idx = tabs.findIndex(t => t.id === tab);
              if (idx < tabs.length - 1) setTab(tabs[idx + 1].id);
            }} />
            <EpicButton label="Submit to Payer Portal →" primary={true} onClick={() => alert("WARNING: This will open the payer's separate portal where you will need to re-enter all of this information manually.\n\nAre you sure you want to continue?")} />
          </div>
        </div>

        {/* Comparison CTA */}
        <div style={{ marginTop: "16px", padding: "14px 16px", background: "#003366", color: "white", borderRadius: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "4px" }}>Current State: The Manual Workflow</div>
            <div style={{ fontSize: "11px", opacity: 0.85 }}>5 tabs · 80+ fields · manual re-entry into 4 separate systems · average 45 minutes per patient · no automated denial risk detection</div>
          </div>
          <a
            href="/"
            style={{ background: "#00a651", color: "white", padding: "10px 20px", borderRadius: "4px", textDecoration: "none", fontWeight: "bold", fontSize: "12px", whiteSpace: "nowrap", border: "none", cursor: "pointer" }}
          >
            View AuthFlow AI Solution
          </a>
        </div>

      </div>
    </div>
  );
}

// Reusable components

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: "10px", paddingBottom: "6px", borderBottom: "2px solid #003366" }}>
      <div style={{ fontWeight: "bold", fontSize: "12px", color: "#003366" }}>{title}</div>
      {subtitle && <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>{subtitle}</div>}
    </div>
  );
}

function SectionDivider({ title }) {
  return (
    <div style={{ background: "#c8c4b8", padding: "3px 6px", fontWeight: "bold", fontSize: "11px", marginBottom: "6px", marginTop: "8px", borderLeft: "3px solid #003366" }}>
      {title}
    </div>
  );
}

function Field({ label, type = "text", placeholder = "", options = [] }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "10px", fontWeight: "bold", marginBottom: "2px", color: "#333" }}>{label}</label>
      {type === "select" ? (
        <select style={{ width: "100%", border: "1px solid #888", padding: "3px 4px", fontFamily: "'Courier New', monospace", fontSize: "11px", background: "white", height: "22px" }}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          style={{ width: "100%", border: "1px solid #888", padding: "3px 4px", fontFamily: "'Courier New', monospace", fontSize: "11px", background: "white", height: "22px" }}
        />
      )}
    </div>
  );
}

function EpicButton({ label, onClick, primary = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 12px",
        background: primary ? "#003366" : "#d4d0c8",
        color: primary ? "white" : "#000",
        border: "2px solid",
        borderColor: primary ? "#001a4d" : "#888",
        fontFamily: "'Courier New', monospace",
        fontSize: "11px",
        cursor: "pointer",
        fontWeight: primary ? "bold" : "normal",
      }}
    >
      {label}
    </button>
  );
}