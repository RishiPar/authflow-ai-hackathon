"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const API_BASE = "http://127.0.0.1:8000/api";

const requiredDocsByCaseType = {
  Imaging: [
    "Eligibility Verified",
    "Physician Order",
    "Clinical Notes",
    "Diagnosis Code",
    "Conservative Treatment",
    "Physical Therapy Notes",
  ],
  Medication: [
    "Eligibility Verified",
    "Prescription / Physician Order",
    "Clinical Notes",
    "Diagnosis Code",
    "Medication History / Failed Alternatives",
    "Formulary Exception / Step Therapy Notes",
  ],
};

const demoPatient = {
  case_type: "Imaging",
  patient_name: "Maria Lopez",
  age: "46",
  symptoms: "Lower back pain for 8 weeks with limited mobility",
  symptoms_duration_weeks: "8",
  requested_procedure: "Lumbar Spine MRI",
  requested_medication: "N/A",
  insurance_provider: "BlueCross Mock PPO",
  insurance_plan_type: "Commercial PPO",
  referral_status: "Incomplete",
  diagnosis_code: "",
  eligibility_verification: true,
  physician_order: false,
  clinical_notes: true,
  conservative_treatment: false,
  physical_therapy_notes: false,
  medication_history: false,
  formulary_exception: false,
};

const medicineDemoPatient = {
  case_type: "Medication",
  patient_name: "James Carter",
  age: "58",
  symptoms: "Chronic joint inflammation with inadequate response to lower-cost medication",
  symptoms_duration_weeks: "12",
  requested_procedure: "Medication Prior Authorization",
  requested_medication: "Humira",
  insurance_provider: "BlueCross Mock PPO",
  insurance_plan_type: "Commercial PPO",
  referral_status: "N/A",
  diagnosis_code: "",
  eligibility_verification: true,
  physician_order: false,
  clinical_notes: true,
  conservative_treatment: false,
  physical_therapy_notes: false,
  medication_history: false,
  formulary_exception: false,
};

export default function Page() {
  const [patients, setPatients] = useState([]);
  const [metrics, setMetrics] = useState({
    total_patients: 0,
    high_risk_cases: 0,
    prior_auth_required_count: 0,
    missing_documents_count: 0,
  });

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [form, setForm] = useState(demoPatient);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [workspaceMode, setWorkspaceMode] = useState("intake");
  const [patientTab, setPatientTab] = useState("summary");
  const workspaceRef = useRef(null);

  function scrollToWorkspace() {
    window.setTimeout(() => {
      workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  async function loadDashboard() {
    try {
      const patientsRes = await fetch(`${API_BASE}/patients`);
      const metricsRes = await fetch(`${API_BASE}/dashboard-metrics`);
      const patientsData = patientsRes.ok ? await patientsRes.json() : [];
      const metricsData = metricsRes.ok ? await metricsRes.json() : metrics;
      setPatients(patientsData);
      setMetrics(metricsData);
      setError("");
    } catch {
      setError("Backend is not running. Start FastAPI on http://127.0.0.1:8000");
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function startNewIntake() {
    setWorkspaceMode("intake");
    setPatientTab("summary");
    setSelectedPatient(null);
    setForm(demoPatient);
  }

  function loadImagingDemo() {
    setWorkspaceMode("intake");
    setPatientTab("summary");
    setSelectedPatient(null);
    setForm(demoPatient);
  }

  function loadMedicineDemo() {
    setWorkspaceMode("intake");
    setPatientTab("summary");
    setSelectedPatient(null);
    setForm(medicineDemoPatient);
  }

  function openExistingPatient(patient) {
    setSelectedPatient(patient);
    setWorkspaceMode("patient");
    setPatientTab("summary");
    scrollToWorkspace();
  }

  async function submitIntake(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const requestedProcedure =
      form.case_type === "Medication"
        ? `Medication Prior Authorization - ${form.requested_medication}`
        : form.requested_procedure;

    const payload = {
      patient_name: form.patient_name,
      age: Number(form.age),
      symptoms:
        form.case_type === "Medication"
          ? `${form.symptoms}. Requested medication: ${form.requested_medication}.`
          : form.symptoms,
      symptoms_duration_weeks: Number(form.symptoms_duration_weeks),
      requested_procedure: requestedProcedure,
      insurance_provider: form.insurance_provider,
      insurance_plan_type: form.insurance_plan_type,
      referral_status: form.referral_status,
      diagnosis_code: form.diagnosis_code || null,
      documents_provided: {
        insurance_card: true,
        eligibility_verification: form.eligibility_verification,
        physician_order: form.physician_order,
        diagnosis_code_doc: Boolean(form.diagnosis_code),
        clinical_notes: form.clinical_notes,
        referral: form.referral_status === "Justified",
        conservative_treatment:
          form.case_type === "Medication" ? form.medication_history : form.conservative_treatment,
        physical_therapy_notes:
          form.case_type === "Medication" ? form.formulary_exception : form.physical_therapy_notes,
        prior_auth_form: false,
        payer_policy_reference: false,
      },
    };

    try {
      const res = await fetch(`${API_BASE}/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to submit intake.");
      const newPatient = await res.json();
      setSelectedPatient(newPatient);
      setWorkspaceMode("patient");
      setPatientTab("summary");
      scrollToWorkspace();
      await loadDashboard();
    } catch {
      setError("Could not submit intake. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Hero />

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
          <strong>Demo safety notice:</strong> This MVP uses fake/mock patient and insurance data only. It is not for clinical use, does not process real PHI, and does not claim HIPAA compliance.
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-4">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Total Cases" value={metrics.total_patients} />
          <MetricCard label="High Risk Cases" value={metrics.high_risk_cases} />
          <MetricCard label="PA Required" value={metrics.prior_auth_required_count} />
          <MetricCard label="Missing Docs" value={metrics.missing_documents_count} />
        </div>
      </section>

      <WorkflowSection />

      {error && (
        <section className="mx-auto max-w-7xl px-6 py-2">
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">{error}</div>
        </section>
      )}

      <section ref={workspaceRef} className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Case Workspace</h2>
            <p className="text-sm text-slate-500">Create a new intake or open a saved patient record.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={startNewIntake} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">New Intake</button>
            <button onClick={loadImagingDemo} className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">Load Imaging Demo</button>
            <button onClick={loadMedicineDemo} className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100">Load Medicine Demo</button>
          </div>
        </div>

        {workspaceMode === "intake" ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <IntakeForm form={form} updateForm={updateForm} submitIntake={submitIntake} loading={loading} loadImagingDemo={loadImagingDemo} loadMedicineDemo={loadMedicineDemo} />
            <IntakePreview form={form} />
          </section>
        ) : (
          <PatientRecord patient={selectedPatient} patientTab={patientTab} setPatientTab={setPatientTab} onNewIntake={startNewIntake} />
        )}
      </section>

      <OperationsQueue patients={patients} openExistingPatient={openExistingPatient} />
      <ArchitectureSection />
    </main>
  );
}

function Hero() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
            Imaging + Medication Prior Authorization
          </div>

          {/* Toggle switch + Live Demo badge */}
          <div className="flex items-center gap-3">
            {/* Live Demo pulsing badge */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Demo
            </div>

            {/* Toggle switcher */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400">Traditional</span>
              <button
                onClick={() => window.location.href = "/beforeDemo"}
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  width: "52px",
                  height: "28px",
                  borderRadius: "999px",
                  backgroundColor: "#2563eb",
                  border: "none",
                  cursor: "pointer",
                  padding: "0",
                  transition: "background-color 0.2s",
                }}
                title="Switch to Traditional Workflow"
              >
                <span style={{
                  position: "absolute",
                  right: "4px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: "white",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  transition: "transform 0.2s",
                }} />
              </button>
              <span className="text-xs font-semibold text-blue-700">AuthFlow AI</span>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">AuthFlow AI</h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-700">
              AI-powered healthcare operations assistant for patient intake, insurance verification, prior authorization, denial-risk detection, and staff workflow recommendations.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">Imaging Authorization</span>
              <span className="rounded-full bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700">Medicine Authorization</span>
              <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">Denial Risk Scoring</span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Streamlined Staff Workflow</h2>
            <p className="mt-2 text-slate-700">
              Staff create an intake, run AI analysis, then open a saved patient record with tabs for summary, uploaded documents, history, and raw operational data.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">AI Workflow</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <WorkflowStep number="1" title="Patient Intake" />
          <WorkflowStep number="2" title="Eligibility Check" />
          <WorkflowStep number="3" title="Policy Retrieval" />
          <WorkflowStep number="4" title="Risk Analysis" />
          <WorkflowStep number="5" title="Patient Record" />
        </div>
      </div>
    </section>
  );
}

function IntakeForm({ form, updateForm, submitIntake, loading, loadImagingDemo, loadMedicineDemo }) {
  const isMedication = form.case_type === "Medication";
  const tone = isMedication
    ? { form: "border-purple-200 bg-purple-50/70 shadow-purple-100", heading: "text-purple-950", description: "text-purple-700", activeButton: "border-purple-700 bg-purple-600 text-white shadow-sm", inactiveButton: "border-blue-200 bg-white text-blue-700 hover:bg-blue-50", submit: "bg-purple-600 hover:bg-purple-700 focus:ring-purple-100" }
    : { form: "border-blue-200 bg-blue-50/70 shadow-blue-100", heading: "text-blue-950", description: "text-blue-700", activeButton: "border-blue-700 bg-blue-600 text-white shadow-sm", inactiveButton: "border-purple-200 bg-white text-purple-700 hover:bg-purple-50", submit: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-100" };

  return (
    <form onSubmit={submitIntake} className={`rounded-2xl border p-6 shadow-sm transition-colors duration-300 ${tone.form}`}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${tone.heading}`}>Patient Intake</h2>
          <p className={`text-sm ${tone.description}`}>Submit a mock imaging or medicine authorization request.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={loadImagingDemo} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${isMedication ? tone.inactiveButton : tone.activeButton}`}>Imaging</button>
          <button type="button" onClick={loadMedicineDemo} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${isMedication ? tone.activeButton : tone.inactiveButton}`}>Medicine</button>
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <Select label="Case Type" value={form.case_type} onChange={(v) => { if (v === "Medication") { updateForm("case_type", "Medication"); updateForm("requested_procedure", "Medication Prior Authorization"); updateForm("requested_medication", "Humira"); updateForm("referral_status", "N/A"); } else { updateForm("case_type", "Imaging"); updateForm("requested_procedure", "Lumbar Spine MRI"); updateForm("requested_medication", "N/A"); updateForm("referral_status", "Incomplete"); } }} options={["Imaging", "Medication"]} />
        <Select label="Insurance Provider" value={form.insurance_provider} onChange={(v) => updateForm("insurance_provider", v)} options={["BlueCross Mock PPO", "Medicare Advantage Mock Plan", "Medicaid Mock Managed Care", "UnitedCare Mock Commercial", "Self-Pay / Unverified Insurance"]} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Patient Name" value={form.patient_name} onChange={(v) => updateForm("patient_name", v)} />
        <Input label="Age" type="number" value={form.age} onChange={(v) => updateForm("age", v)} />
        <Input label="Symptom Duration (Weeks)" type="number" value={form.symptoms_duration_weeks} onChange={(v) => updateForm("symptoms_duration_weeks", v)} />
        <Input label="Diagnosis Code" value={form.diagnosis_code} onChange={(v) => updateForm("diagnosis_code", v)} placeholder="Example: M54.50" required={false} />
        {isMedication ? (
          <Select label="Medicine" value={form.requested_medication} onChange={(v) => updateForm("requested_medication", v)} options={["Humira", "Ozempic", "Wegovy", "Mounjaro", "Enbrel", "Stelara", "Dupixent", "Eliquis", "Repatha", "Xolair"]} />
        ) : (
          <Select label="Procedure" value={form.requested_procedure} onChange={(v) => updateForm("requested_procedure", v)} options={["Lumbar Spine MRI", "Knee MRI", "Shoulder MRI", "Cervical Spine MRI"]} />
        )}
        <Select label="Plan Type" value={form.insurance_plan_type} onChange={(v) => updateForm("insurance_plan_type", v)} options={["Commercial PPO", "Medicare Advantage Mock Plan", "Medicaid Mock Managed Care", "Self-Pay / Unverified"]} />
        <Select label="Referral Status" value={form.referral_status} onChange={(v) => updateForm("referral_status", v)} options={["None", "Incomplete", "Justified", "N/A"]} />
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">Symptoms / Medical Need</label>
        <textarea value={form.symptoms} onChange={(e) => updateForm("symptoms", e.target.value)} className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Describe symptoms and medical need..." />
      </div>

      <div className="mt-5">
        <p className="mb-3 text-sm font-medium text-slate-700">Documents Provided</p>
        <div className="grid gap-3 md:grid-cols-2">
          <Checkbox label="Eligibility Verified" checked={form.eligibility_verification} onChange={(v) => updateForm("eligibility_verification", v)} />
          <Checkbox label={isMedication ? "Prescription / Physician Order" : "Physician Order"} checked={form.physician_order} onChange={(v) => updateForm("physician_order", v)} />
          <Checkbox label="Clinical Notes" checked={form.clinical_notes} onChange={(v) => updateForm("clinical_notes", v)} />
          {isMedication ? (
            <>
              <Checkbox label="Medication History / Failed Alternatives" checked={form.medication_history} onChange={(v) => updateForm("medication_history", v)} />
              <Checkbox label="Formulary Exception / Step Therapy Notes" checked={form.formulary_exception} onChange={(v) => updateForm("formulary_exception", v)} />
            </>
          ) : (
            <>
              <Checkbox label="Conservative Treatment" checked={form.conservative_treatment} onChange={(v) => updateForm("conservative_treatment", v)} />
              <Checkbox label="Physical Therapy Notes" checked={form.physical_therapy_notes} onChange={(v) => updateForm("physical_therapy_notes", v)} />
            </>
          )}
        </div>
      </div>

      <button type="submit" disabled={loading} className={`mt-6 w-full rounded-xl px-4 py-3 font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${tone.submit}`}>
        {loading ? "Running AI Analysis..." : "Create Intake Record & Analyze"}
      </button>
    </form>
  );
}

function IntakePreview({ form }) {
  const isMedication = form.case_type === "Medication";
  const requiredDocs = requiredDocsByCaseType[form.case_type];
  const tone = isMedication
    ? { panel: "border-purple-200 bg-purple-50/70 shadow-purple-100", heading: "text-purple-950", description: "text-purple-700", logic: "border-purple-200 bg-purple-100 text-purple-900", logicBody: "text-purple-800" }
    : { panel: "border-blue-200 bg-blue-50/70 shadow-blue-100", heading: "text-blue-950", description: "text-blue-700", logic: "border-blue-200 bg-blue-100 text-blue-900", logicBody: "text-blue-800" };

  const completedDocs = getCompletedDocsFromForm(form);
  const missingDocs = requiredDocs.filter((doc) => !completedDocs.includes(doc));

  return (
    <section className={`rounded-2xl border p-6 shadow-sm transition-colors duration-300 ${tone.panel}`}>
      <h2 className={`text-2xl font-bold ${tone.heading}`}>Intake Preview</h2>
      <p className={`mt-1 text-sm ${tone.description}`}>This preview shows how the case will be interpreted before submission.</p>
      <div className="mt-6 grid gap-4">
        <PreviewRow label="Case Type" value={form.case_type} />
        <PreviewRow label="Patient" value={`${form.patient_name}, age ${form.age}`} />
        <PreviewRow label={isMedication ? "Medicine" : "Procedure"} value={isMedication ? form.requested_medication : form.requested_procedure} />
        <PreviewRow label="Insurance" value={form.insurance_provider} />
        <PreviewRow label="Diagnosis Code" value={form.diagnosis_code || "Missing"} />
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">Required Documents</p>
          <div className="mt-3 space-y-2">
            {requiredDocs.map((doc) => {
              const isDone = completedDocs.includes(doc);
              return (
                <div key={doc} className={`rounded-lg border px-3 py-2 text-sm ${isDone ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                  {isDone ? "✓" : "Missing"} {doc}
                </div>
              );
            })}
          </div>
        </div>
        <div className={`rounded-xl border p-4 ${tone.logic}`}>
          <p className="text-sm font-semibold">Pre-Submission Risk Logic</p>
          <p className={`mt-2 text-sm ${tone.logicBody}`}>
            {missingDocs.length === 0
              ? "All required documents are selected. The AI risk score will display as 0/100."
              : `${missingDocs.length} required document(s) are missing. The AI dashboard will flag this case before submission.`}
          </p>
        </div>
      </div>
    </section>
  );
}

function PatientRecord({ patient, patientTab, setPatientTab, onNewIntake }) {
  const normalized = useMemo(() => normalizePatient(patient), [patient]);

  if (!patient) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-500">No patient selected.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-700">Saved Patient Record</p>
            <h2 className="mt-1 text-3xl font-bold text-slate-950">{normalized.name}</h2>
            <p className="mt-2 text-sm text-slate-500">{normalized.request} • {normalized.insurance}</p>
          </div>
          <button onClick={onNewIntake} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">New Intake</button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <ResultCard label="PA Required" value={normalized.priorAuthRequired ? "Yes" : "No"} tone={normalized.priorAuthRequired ? "amber" : "green"} />
          <ResultCard label="AI Risk Score" value={`${normalized.displayRiskScore}/100`} tone={normalized.displayRiskScore === 0 ? "green" : normalized.displayRiskScore >= 70 ? "red" : normalized.displayRiskScore >= 40 ? "amber" : "green"} />
          <ResultCard label="Denial Risk" value={normalized.displayRiskLabel} tone={normalized.displayRiskLabel === "High" ? "red" : normalized.displayRiskLabel === "Medium" ? "amber" : "green"} />
          <ResultCard label="Missing Docs" value={normalized.missingDocuments.length} tone={normalized.missingDocuments.length > 0 ? "red" : "green"} />
        </div>
      </div>

      <div className="border-b border-slate-200 px-6">
        <div className="flex flex-wrap gap-2">
          <PatientTabButton active={patientTab === "summary"} onClick={() => setPatientTab("summary")}>AI Summary</PatientTabButton>
          <PatientTabButton active={patientTab === "documents"} onClick={() => setPatientTab("documents")}>Documents</PatientTabButton>
          <PatientTabButton active={patientTab === "history"} onClick={() => setPatientTab("history")}>Patient History</PatientTabButton>
          <PatientTabButton active={patientTab === "raw"} onClick={() => setPatientTab("raw")}>Raw Data</PatientTabButton>
        </div>
      </div>

      <div className="p-6">
        {patientTab === "summary" && <AISummaryTab normalized={normalized} />}
        {patientTab === "documents" && <DocumentsTab normalized={normalized} patient={patient} />}
        {patientTab === "history" && <PatientHistoryTab normalized={normalized} />}
        {patientTab === "raw" && <RawDataTab patient={patient} />}
      </div>
    </section>
  );
}

function AISummaryTab({ normalized }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-semibold text-slate-950">Clinical Summary</h3>
          <p className="mt-2 text-sm text-slate-700">{normalized.symptoms}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-slate-950">AI Risk Score</h3>
            <span className="text-sm text-slate-500">{normalized.displayRiskScore}/100</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full rounded-full ${normalized.displayRiskScore === 0 ? "bg-emerald-500" : normalized.displayRiskScore >= 70 ? "bg-red-500" : normalized.displayRiskScore >= 40 ? "bg-amber-500" : "bg-blue-600"}`} style={{ width: `${normalized.displayRiskScore}%` }} />
          </div>
          {normalized.displayRiskScore === 0 ? (
            <p className="mt-3 text-sm text-emerald-700">All required documentation appears complete. Risk score reduced to 0/100.</p>
          ) : (
            <p className="mt-3 text-sm text-slate-600">Risk is based on missing documentation, payer friction, and authorization readiness.</p>
          )}
        </div>
      </div>
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-semibold text-slate-950">Missing Documents</h3>
          {normalized.missingDocuments.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {normalized.missingDocuments.map((doc, index) => (
                <li key={index} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{doc}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">No missing documents detected.</p>
          )}
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="font-semibold text-blue-900">Staff Recommendation</h3>
          <p className="mt-2 text-sm text-blue-800">
            {normalized.missingDocuments.length === 0
              ? "Proceed with authorization submission. Documentation appears complete for this workflow."
              : normalized.recommendedAction || "Request missing documentation before submitting prior authorization."}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-semibold text-slate-950">Payer Policy Summary</h3>
          <p className="mt-2 text-sm text-slate-700">
            {normalized.payerPolicySummary || "Prior authorization may be required. Supporting documentation should show medical necessity, diagnosis code, payer-specific requirements, and relevant clinical history."}
          </p>
        </div>
      </div>
    </div>
  );
}

function DocumentsTab({ normalized, patient }) {
  const uploadedDocs = getUploadedDocsFromPatient(patient, normalized);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="font-semibold text-slate-950">Uploaded Documents</h3>
        <p className="mt-1 text-sm text-slate-500">Documents the staff has already collected.</p>
        <div className="mt-4 space-y-2">
          {uploadedDocs.length > 0 ? uploadedDocs.map((doc) => (
            <div key={doc} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ {doc}</div>
          )) : (
            <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">No uploaded documents detected.</p>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="font-semibold text-slate-950">Required / Missing</h3>
        <p className="mt-1 text-sm text-slate-500">Items to collect before submission.</p>
        <div className="mt-4 space-y-2">
          {normalized.missingDocuments.length > 0 ? normalized.missingDocuments.map((doc) => (
            <div key={doc} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Missing: {doc}</div>
          )) : (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">All required documents appear complete.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PatientHistoryTab({ normalized }) {
  const historyItems = [
    { title: "Patient intake created", detail: `${normalized.name} submitted an authorization request for ${normalized.request}.` },
    { title: "Insurance checked", detail: `${normalized.insurance} was reviewed using mock eligibility and payer rules.` },
    { title: "AI analysis completed", detail: normalized.missingDocuments.length === 0 ? "AI marked documentation as complete and reduced risk score to 0/100." : `AI detected ${normalized.missingDocuments.length} missing document(s).` },
    { title: "Staff action generated", detail: normalized.missingDocuments.length === 0 ? "Recommended action: proceed with submission." : "Recommended action: request missing documents before submission." },
  ];
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="font-semibold text-slate-950">Patient History</h3>
      <p className="mt-1 text-sm text-slate-500">Mock timeline of this authorization workflow.</p>
      <div className="mt-5 space-y-4">
        {historyItems.map((item, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{index + 1}</div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-950">{item.title}</p>
              <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RawDataTab({ patient }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-950 p-5">
      <h3 className="font-semibold text-white">Structured JSON Response</h3>
      <pre className="mt-4 max-h-[500px] overflow-auto rounded-lg bg-black p-4 text-xs text-emerald-300">{JSON.stringify(patient, null, 2)}</pre>
    </div>
  );
}

function OperationsQueue({ patients, openExistingPatient }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">Saved Patient Queue</h2>
        <p className="mt-1 text-sm text-slate-500">Click a patient to open a dedicated record with tabs.</p>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">Patient</th>
                <th className="p-3">Request</th>
                <th className="p-3">Insurance</th>
                <th className="p-3">AI Score</th>
                <th className="p-3">Risk</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr><td className="p-4 text-slate-500" colSpan="6">No patients loaded yet.</td></tr>
              ) : (
                patients.map((patient) => {
                  const normalized = normalizePatient(patient);
                  return (
                    <tr key={patient.id} onClick={() => openExistingPatient(patient)} className="cursor-pointer border-t border-slate-200 hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-900">{normalized.name}</td>
                      <td className="p-3">{normalized.request}</td>
                      <td className="p-3">{normalized.insurance}</td>
                      <td className="p-3">{normalized.displayRiskScore}/100</td>
                      <td className="p-3">{normalized.displayRiskLabel}</td>
                      <td className="p-3">{normalized.status || "Pending Review"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ArchitectureSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">System Architecture</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-6">
          <ArchitectureBox title="Next.js" subtitle="Patient Intake UI" />
          <ArchitectureBox title="FastAPI" subtitle="Backend API" />
          <ArchitectureBox title="SQLite" subtitle="Mock Case Storage" />
          <ArchitectureBox title="LangGraph" subtitle="Workflow Agent" />
          <ArchitectureBox title="ChromaDB" subtitle="Policy Retrieval" />
          <ArchitectureBox title="OpenAI" subtitle="Structured AI Output" />
        </div>
      </div>
    </section>
  );
}

function normalizePatient(patient) {
  const analysis = patient?.analysis || {};
  const request = patient?.procedure_name || patient?.requested_procedure || "Authorization Request";
  const caseType = request.toLowerCase().includes("medication") || request.toLowerCase().includes("humira") || request.toLowerCase().includes("ozempic") || request.toLowerCase().includes("wegovy") || request.toLowerCase().includes("mounjaro") ? "Medication" : "Imaging";
  const missingDocuments = analysis?.missing_documents || [];
  const rawRiskScore = analysis?.initial_risk_score ?? analysis?.risk_score ?? 45;
  const displayRiskScore = missingDocuments.length === 0 ? 0 : rawRiskScore;
  const rawRiskLabel = analysis?.initial_denial_risk || analysis?.denial_risk || "Medium";
  const displayRiskLabel = missingDocuments.length === 0 ? "Low" : rawRiskLabel;
  return {
    id: patient?.id,
    name: patient?.name || patient?.patient_name || "Unknown Patient",
    request, caseType,
    insurance: patient?.provider || patient?.insurance_provider || "Unknown Insurance",
    symptoms: patient?.symptoms || "No symptoms available.",
    status: patient?.status || "Pending Review",
    analysis, missingDocuments, rawRiskScore, displayRiskScore, rawRiskLabel, displayRiskLabel,
    priorAuthRequired: analysis?.prior_authorization_required === undefined ? true : analysis?.prior_authorization_required,
    recommendedAction: analysis?.recommended_action,
    payerPolicySummary: analysis?.payer_policy_summary,
  };
}

function getCompletedDocsFromForm(form) {
  const docs = [];
  if (form.eligibility_verification) docs.push("Eligibility Verified");
  if (form.physician_order) { docs.push("Physician Order"); docs.push("Prescription / Physician Order"); }
  if (form.clinical_notes) docs.push("Clinical Notes");
  if (form.diagnosis_code) docs.push("Diagnosis Code");
  if (form.case_type === "Medication") {
    if (form.medication_history) docs.push("Medication History / Failed Alternatives");
    if (form.formulary_exception) docs.push("Formulary Exception / Step Therapy Notes");
  } else {
    if (form.conservative_treatment) docs.push("Conservative Treatment");
    if (form.physical_therapy_notes) docs.push("Physical Therapy Notes");
  }
  return docs;
}

function getUploadedDocsFromPatient(patient, normalized) {
  const analysis = patient?.analysis || {};
  const missing = normalized.missingDocuments || [];
  const required = requiredDocsByCaseType[normalized.caseType] || requiredDocsByCaseType.Imaging;
  const uploadedFromRequired = required.filter((doc) => !missing.some((missingDoc) => String(missingDoc).toLowerCase().includes(doc.toLowerCase())));
  const backendDocs = analysis?.documents_provided || analysis?.provided_documents;
  if (Array.isArray(backendDocs)) return [...new Set([...uploadedFromRequired, ...backendDocs])];
  return uploadedFromRequired;
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value ?? 0}</p>
    </div>
  );
}

function WorkflowStep({ number, title }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{number}</div>
      <p className="font-semibold text-slate-900">{title}</p>
    </div>
  );
}

function PreviewRow({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = "", required = true }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}

function ResultCard({ label, value, tone }) {
  const styles = { green: "border-emerald-200 bg-emerald-50 text-emerald-800", amber: "border-amber-200 bg-amber-50 text-amber-800", red: "border-red-200 bg-red-50 text-red-800" };
  return (
    <div className={`rounded-xl border p-5 ${styles[tone] || styles.green}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function PatientTabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`border-b-2 px-4 py-3 text-sm font-semibold ${active ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}>
      {children}
    </button>
  );
}

function ArchitectureBox({ title, subtitle }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}