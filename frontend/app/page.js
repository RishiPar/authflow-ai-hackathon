"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

const medicineOptions = [
  "Humira",
  "Ozempic",
  "Wegovy",
  "Mounjaro",
  "Enbrel",
  "Stelara",
  "Dupixent",
  "Eliquis",
  "Repatha",
  "Xolair",
];

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

const mockCodeGuidance = {
  "Lumbar Spine MRI": ["72148", "72149", "72158"],
  "Knee MRI": ["73721", "73722", "73723"],
  "Shoulder MRI": ["73221", "73222", "73223"],
  "Cervical Spine MRI": ["72141", "72142", "72156"],
  Humira: ["J0135"],
  Ozempic: ["J3490"],
  Wegovy: ["J3490"],
  Mounjaro: ["J3590"],
  Enbrel: ["J1438"],
  Stelara: ["J3357"],
  Dupixent: ["J3590"],
  Eliquis: ["J8499"],
  Repatha: ["J3590"],
  Xolair: ["J2357"],
};

const imagingDemoPatient = {
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
  symptoms:
    "Chronic joint inflammation with inadequate response to lower-cost medication",
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
  const workspaceRef = useRef(null);

  const [patients, setPatients] = useState([]);
  const [metrics, setMetrics] = useState({
    total_patients: 0,
    high_risk_cases: 0,
    prior_auth_required_count: 0,
    missing_documents_count: 0,
  });

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [form, setForm] = useState(imagingDemoPatient);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [codeConfirmation, setCodeConfirmation] = useState(null);

  const [workspaceMode, setWorkspaceMode] = useState("intake");
  const [patientTab, setPatientTab] = useState("summary");

  function scrollToWorkspace() {
    setTimeout(() => {
      const target = workspaceRef.current;
      if (!target) return;

      const startY = window.scrollY;
      const targetY = target.getBoundingClientRect().top + window.scrollY;
      const distance = targetY - startY;
      const duration = 900;
      let startTime = null;

      function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        window.scrollTo(0, startY + distance * easeInOutCubic(progress));

        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      }

      window.requestAnimationFrame(step);
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

  useEffect(() => {
    loadDashboard();
  }, []);

  function updateForm(field, value) {
    if (field === "diagnosis_code") {
      setCodeConfirmation(null);
    }

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function buildPatientPayload(sourceForm) {
    const requestedProcedure =
      sourceForm.case_type === "Medication"
        ? `Medication Prior Authorization - ${sourceForm.requested_medication}`
        : sourceForm.requested_procedure;

    return {
      patient_name: sourceForm.patient_name,
      age: Number(sourceForm.age),
      symptoms:
        sourceForm.case_type === "Medication"
          ? `${sourceForm.symptoms}. Requested medication: ${sourceForm.requested_medication}.`
          : sourceForm.symptoms,
      symptoms_duration_weeks: Number(sourceForm.symptoms_duration_weeks),
      requested_procedure: requestedProcedure,
      insurance_provider: sourceForm.insurance_provider,
      insurance_plan_type: sourceForm.insurance_plan_type,
      referral_status: sourceForm.referral_status,
      diagnosis_code: sourceForm.diagnosis_code || null,
      documents_provided: {
        insurance_card: true,
        eligibility_verification: sourceForm.eligibility_verification,
        physician_order: sourceForm.physician_order,
        diagnosis_code_doc: Boolean(sourceForm.diagnosis_code),
        clinical_notes: sourceForm.clinical_notes,
        referral: sourceForm.referral_status === "Justified",
        conservative_treatment:
          sourceForm.case_type === "Medication"
            ? sourceForm.medication_history
            : sourceForm.conservative_treatment,
        physical_therapy_notes:
          sourceForm.case_type === "Medication"
            ? sourceForm.formulary_exception
            : sourceForm.physical_therapy_notes,
        prior_auth_form: false,
        payer_policy_reference: false,
      },
    };
  }

  function startNewIntake() {
    setSelectedPatient(null);
    setPatientTab("summary");
    setWorkspaceMode("intake");
    setForm(imagingDemoPatient);
    scrollToWorkspace();
  }

  function showPatientQueue() {
    setSelectedPatient(null);
    setPatientTab("summary");
    setWorkspaceMode("queue");
    scrollToWorkspace();
  }

  function loadImagingDemo() {
    setSelectedPatient(null);
    setPatientTab("summary");
    setWorkspaceMode("intake");
    setForm(imagingDemoPatient);
    scrollToWorkspace();
  }

  function loadMedicineDemo() {
    setSelectedPatient(null);
    setPatientTab("summary");
    setWorkspaceMode("intake");
    setForm(medicineDemoPatient);
    scrollToWorkspace();
  }

  function openExistingPatient(patient) {
    setSelectedPatient(patient);
    setPatientTab("summary");
    setWorkspaceMode("patient");
    scrollToWorkspace();
  }

  async function submitIntake(e, options = {}) {
    e?.preventDefault();

    const codeReview = getCodeReviewForForm(form);
    if (codeReview?.isMismatch && !options.skipCodeConfirmation) {
      setCodeConfirmation(codeReview);
      return;
    }

    setLoading(true);
    setError("");
    setCodeConfirmation(null);

    const payload = buildPatientPayload(form);

    try {
      const res = await fetch(`${API_BASE}/intake`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to submit intake.");
      }

      const newPatient = await res.json();

      setSelectedPatient(newPatient);
      setPatientTab("summary");
      setWorkspaceMode("patient");

      await loadDashboard();
      scrollToWorkspace();
    } catch {
      setError("Could not submit intake. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  async function updateExistingPatient(patientId, editedForm) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/patients/${patientId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPatientPayload(editedForm)),
      });

      if (!res.ok) {
        throw new Error("Failed to update patient.");
      }

      const updatedPatient = await res.json();
      setSelectedPatient(updatedPatient);
      setPatientTab("summary");
      setWorkspaceMode("patient");
      await loadDashboard();
      scrollToWorkspace();
      return true;
    } catch {
      setError("Could not update patient. Make sure the backend is running.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function deletePatient(patientId) {
    const shouldDelete = window.confirm("Delete this saved patient profile?");
    if (!shouldDelete) return;

    setError("");

    try {
      const res = await fetch(`${API_BASE}/patients/${patientId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete patient.");
      }

      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null);
        setPatientTab("summary");
        setWorkspaceMode("queue");
      }

      await loadDashboard();
      scrollToWorkspace();
    } catch {
      setError("Could not delete patient. Make sure the backend is running.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Hero />

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
          <strong>Demo safety notice:</strong> This MVP uses fake/mock patient
          and insurance data only. It is not for clinical use, does not process
          real PHI, and does not claim HIPAA compliance.
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-4">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Total Cases" value={metrics.total_patients} />
          <MetricCard label="Needs Review" value={metrics.high_risk_cases} />
          <MetricCard
            label="PA Required"
            value={metrics.prior_auth_required_count}
          />
          <MetricCard
            label="Missing Docs"
            value={metrics.missing_documents_count}
          />
        </div>
      </section>

      {error && (
        <section className="mx-auto max-w-7xl px-6 py-2">
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        </section>
      )}

      <section ref={workspaceRef} className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">
              Case Workspace
            </h2>
            <p className="text-sm text-slate-500">
              Create a new intake, review saved patients, or open a patient
              record.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={startNewIntake}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              New Intake
            </button>

            <button
              onClick={showPatientQueue}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              View Saved Patients
            </button>

            <button
              onClick={loadImagingDemo}
              className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              Load Imaging Demo
            </button>

            <button
              onClick={loadMedicineDemo}
              className="rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
            >
              Load Medicine Demo
            </button>
          </div>
        </div>

        {workspaceMode === "intake" && (
          <section className="grid gap-6 lg:grid-cols-2">
            <IntakeForm
              form={form}
              updateForm={updateForm}
              submitIntake={submitIntake}
              loading={loading}
              loadImagingDemo={loadImagingDemo}
              loadMedicineDemo={loadMedicineDemo}
              onClose={showPatientQueue}
              codeConfirmation={codeConfirmation}
              onCancelCodeConfirmation={() => setCodeConfirmation(null)}
            />

            <IntakePreview form={form} />
          </section>
        )}

        {workspaceMode === "queue" && (
          <PatientSelector
            patients={patients}
            openExistingPatient={openExistingPatient}
            onNewIntake={startNewIntake}
            onDeletePatient={deletePatient}
          />
        )}

        {workspaceMode === "patient" && (
          <PatientRecord
            patient={selectedPatient}
            patientTab={patientTab}
            setPatientTab={setPatientTab}
            onNewIntake={startNewIntake}
            onBack={showPatientQueue}
            onSavePatient={updateExistingPatient}
            onDeletePatient={deletePatient}
            saving={loading}
          />
        )}
      </section>

      {workspaceMode !== "queue" && (
        <OperationsQueue
          patients={patients}
          openExistingPatient={openExistingPatient}
          onDeletePatient={deletePatient}
        />
      )}

    </main>
  );
}

function Hero() {
  return (
    <section className="border-b border-blue-100 bg-blue-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700">
            Imaging + Medicine Prior Authorization MVP
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              Live Demo
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-500">
                Traditional
              </span>
              <button
                onClick={() => {
                  window.location.href = "/beforeDemo";
                }}
                title="Switch to Traditional Workflow"
                className="relative inline-flex h-7 w-[52px] items-center rounded-full bg-blue-600"
              >
                <span className="absolute right-1 h-5 w-5 rounded-full bg-white shadow-sm" />
              </button>
              <span className="text-xs font-semibold text-blue-700">
                AuthFlow AI
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">
              AuthFlow AI
            </h1>

            <p className="mt-4 max-w-2xl text-lg text-slate-700">
              AI-powered healthcare operations assistant for patient intake,
              insurance verification, prior authorization, readiness
              detection, and staff workflow recommendations.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                Imaging Authorization
              </span>
              <span className="rounded-full bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700">
                Medicine Authorization
              </span>
              <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                AI Readiness Scoring
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-white/85 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              Investor Demo Focus
            </h2>
            <p className="mt-2 text-slate-700">
              Staff can create an intake, run AI analysis, and open a clean
              patient record showing authorization score, documents, history, and
              case data.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function IntakeForm({
  form,
  updateForm,
  submitIntake,
  loading,
  loadImagingDemo,
  loadMedicineDemo,
  onClose,
  codeConfirmation,
  onCancelCodeConfirmation,
}) {
  const isMedication = form.case_type === "Medication";
  const codeReview = getCodeReviewForForm(form);
  const [showCodeReview, setShowCodeReview] = useState(false);
  const cptInputRef = useRef(null);

  useEffect(() => {
    setShowCodeReview(false);

    if (!codeReview?.isMismatch) return;

    const timeout = window.setTimeout(() => {
      setShowCodeReview(true);
    }, 1400);

    return () => window.clearTimeout(timeout);
  }, [
    codeReview?.enteredCode,
    codeReview?.isMismatch,
    codeReview?.requestLabel,
  ]);

  return (
    <form
      onSubmit={submitIntake}
      className={`rounded-2xl border p-6 shadow-sm transition-colors duration-300 ${
        isMedication
          ? "border-purple-300 bg-purple-50 shadow-purple-100"
          : "border-blue-300 bg-blue-50 shadow-blue-100"
      }`}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">
            Patient Intake
          </h2>
          <p className="text-sm text-slate-600">
            Submit a mock imaging or medicine authorization request.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadImagingDemo}
            className={`rounded-lg border px-4 py-2 text-sm font-bold transition-colors ${
              !isMedication
                ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                : "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            Imaging
          </button>

          <button
            type="button"
            onClick={loadMedicineDemo}
            className={`rounded-lg border px-4 py-2 text-sm font-bold transition-colors ${
              isMedication
                ? "border-purple-600 bg-purple-600 text-white shadow-sm"
                : "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100"
            }`}
          >
            Medicine
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Case Type"
          value={form.case_type}
          onChange={(v) => {
            if (v === "Medication") {
              updateForm("case_type", "Medication");
              updateForm("requested_procedure", "Medication Prior Authorization");
              updateForm("requested_medication", "Humira");
              updateForm("referral_status", "N/A");
            } else {
              updateForm("case_type", "Imaging");
              updateForm("requested_procedure", "Lumbar Spine MRI");
              updateForm("requested_medication", "N/A");
              updateForm("referral_status", "Incomplete");
            }
          }}
          options={["Imaging", "Medication"]}
        />

        <Select
          label="Insurance Provider"
          value={form.insurance_provider}
          onChange={(v) => updateForm("insurance_provider", v)}
          options={[
            "BlueCross Mock PPO",
            "Medicare Advantage Mock Plan",
            "Medicaid Mock Managed Care",
            "UnitedCare Mock Commercial",
            "Self-Pay / Unverified Insurance",
          ]}
        />

        <Input
          label="Patient Name"
          value={form.patient_name}
          onChange={(v) => updateForm("patient_name", v)}
        />

        <Input
          label="Age"
          type="number"
          value={form.age}
          onChange={(v) => updateForm("age", v)}
        />

        <Input
          label="Symptom Duration Weeks"
          type="number"
          value={form.symptoms_duration_weeks}
          onChange={(v) => updateForm("symptoms_duration_weeks", v)}
        />

        <div>
          <Input
            label="CPT / Diagnosis Code"
            value={form.diagnosis_code}
            onChange={(v) => updateForm("diagnosis_code", v)}
            placeholder="Example: 72148 or M54.50"
            required={false}
            invalid={showCodeReview}
            inputRef={cptInputRef}
          />

          {showCodeReview && (
            <div className="mt-2 flex flex-wrap gap-2">
              {codeReview.suggestions.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => updateForm("diagnosis_code", code)}
                  className="rounded-full border border-red-200 bg-white px-3 py-1 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50"
                >
                  {code}
                </button>
              ))}
            </div>
          )}
        </div>

        {isMedication ? (
          <Select
            label="Medicine"
            value={form.requested_medication}
            onChange={(v) => updateForm("requested_medication", v)}
            options={medicineOptions}
          />
        ) : (
          <Select
            label="Procedure"
            value={form.requested_procedure}
            onChange={(v) => updateForm("requested_procedure", v)}
            options={[
              "Lumbar Spine MRI",
              "Knee MRI",
              "Shoulder MRI",
              "Cervical Spine MRI",
            ]}
          />
        )}

        <Select
          label="Plan Type"
          value={form.insurance_plan_type}
          onChange={(v) => updateForm("insurance_plan_type", v)}
          options={[
            "Commercial PPO",
            "Medicare Advantage Mock Plan",
            "Medicaid Mock Managed Care",
            "Self-Pay / Unverified",
          ]}
        />

        <Select
          label="Referral Status"
          value={form.referral_status}
          onChange={(v) => updateForm("referral_status", v)}
          options={["None", "Incomplete", "Justified", "N/A"]}
        />
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Symptoms / Medical Need
        </label>
        <textarea
          value={form.symptoms}
          onChange={(e) => updateForm("symptoms", e.target.value)}
          className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder="Describe symptoms and medical need..."
        />
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-slate-700">
          Documents Provided
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <Checkbox
            label="Eligibility Verified"
            checked={form.eligibility_verification}
            onChange={(v) => updateForm("eligibility_verification", v)}
          />

          <Checkbox
            label={
              isMedication
                ? "Prescription / Physician Order"
                : "Physician Order"
            }
            checked={form.physician_order}
            onChange={(v) => updateForm("physician_order", v)}
          />

          <Checkbox
            label="Clinical Notes"
            checked={form.clinical_notes}
            onChange={(v) => updateForm("clinical_notes", v)}
          />

          {isMedication ? (
            <>
              <Checkbox
                label="Medication History / Failed Alternatives"
                checked={form.medication_history}
                onChange={(v) => updateForm("medication_history", v)}
              />

              <Checkbox
                label="Formulary Exception / Step Therapy Notes"
                checked={form.formulary_exception}
                onChange={(v) => updateForm("formulary_exception", v)}
              />
            </>
          ) : (
            <>
              <Checkbox
                label="Conservative Treatment"
                checked={form.conservative_treatment}
                onChange={(v) => updateForm("conservative_treatment", v)}
              />

              <Checkbox
                label="Physical Therapy Notes"
                checked={form.physical_therapy_notes}
                onChange={(v) => updateForm("physical_therapy_notes", v)}
              />
            </>
          )}
        </div>
      </div>

      {codeConfirmation?.isMismatch && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-900">CPT Code Review</h3>
          <p className="mt-2 text-sm text-red-700">
            The entered code <strong>{codeConfirmation.enteredCode}</strong>{" "}
            does not match the mock suggestions for{" "}
            <strong>{codeConfirmation.requestLabel}</strong>. Do you still want
            to continue?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={(event) =>
                submitIntake(event, { skipCodeConfirmation: true })
              }
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Continue Anyway
            </button>
            <button
              type="button"
              onClick={() => {
                onCancelCodeConfirmation();
                cptInputRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
                window.setTimeout(() => cptInputRef.current?.focus(), 450);
              }}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Review Code
            </button>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`mt-6 w-full rounded-xl px-4 py-3 font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${
          isMedication
            ? "bg-purple-600 hover:bg-purple-700"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "Running AI Analysis..." : "Create Intake Record & Analyze"}
      </button>
    </form>
  );
}

function IntakePreview({ form }) {
  const isMedication = form.case_type === "Medication";
  const requiredDocs = requiredDocsByCaseType[form.case_type];

  const completedDocs = getCompletedDocsFromForm(form);
  const missingDocs = requiredDocs.filter((doc) => !completedDocs.includes(doc));

  return (
    <section
      className={`rounded-2xl border p-6 shadow-sm transition-colors duration-300 ${
        isMedication
          ? "border-purple-300 bg-purple-50 shadow-purple-100"
          : "border-blue-300 bg-blue-50 shadow-blue-100"
      }`}
    >
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div
          className={`mb-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
            isMedication
              ? "bg-purple-100 text-purple-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {isMedication ? "MEDICINE PREVIEW" : "IMAGING PREVIEW"}
        </div>

        <h2 className="text-2xl font-bold text-slate-950">Intake Preview</h2>
        <p className="mt-1 text-sm text-slate-600">
          This shows how the case will be interpreted before submission.
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        <PreviewRow label="Case Type" value={form.case_type} />
        <PreviewRow
          label="Patient"
          value={`${form.patient_name}, age ${form.age}`}
        />
        <PreviewRow
          label={isMedication ? "Medicine" : "Procedure"}
          value={
            isMedication ? form.requested_medication : form.requested_procedure
          }
        />
        <PreviewRow label="Insurance" value={form.insurance_provider} />
        <PreviewRow
          label="Diagnosis Code"
          value={form.diagnosis_code || "Missing"}
        />

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-950">
            Required Documents
          </p>

          <div className="mt-3 space-y-2">
            {requiredDocs.map((doc) => {
              const isDone = completedDocs.includes(doc);

              return (
                <div
                  key={doc}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    isDone
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {isDone ? "✓" : "Missing"} {doc}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-950">
            Pre-Submission Score Logic
          </p>
          <p className="mt-2 text-sm text-slate-700">
            {missingDocs.length === 0
              ? "All required documents are selected. In the demo view, the AI score will display as 0/100."
              : `${missingDocs.length} required document(s) are missing. The AI dashboard will flag this case before submission.`}
          </p>
        </div>
      </div>
    </section>
  );
}

function PatientSelector({
  patients,
  openExistingPatient,
  onNewIntake,
  onDeletePatient,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">
            Select Saved Patient
          </h2>
          <p className="text-sm text-slate-500">
            Choose a patient to open their dedicated record.
          </p>
        </div>

        <button
          onClick={onNewIntake}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          New Intake
        </button>
      </div>

      <PatientTable
        patients={patients}
        openExistingPatient={openExistingPatient}
        onDeletePatient={onDeletePatient}
      />
    </section>
  );
}

function PatientRecord({
  patient,
  patientTab,
  setPatientTab,
  onNewIntake,
  onBack,
  onSavePatient,
  onDeletePatient,
  saving,
}) {
  const normalized = useMemo(() => normalizePatient(patient), [patient]);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => patientToEditableForm(patient));

  useEffect(() => {
    setIsEditing(false);
    setDraft(patientToEditableForm(patient));
  }, [patient]);

  function updateDraft(field, value) {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function saveDraft(e) {
    e.preventDefault();
    const saved = await onSavePatient(patient.id, draft);
    if (saved) {
      setIsEditing(false);
    }
  }

  if (!patient) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          onClick={onBack}
          className="mb-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Back to Patients
        </button>
        <p className="text-slate-500">No patient selected.</p>
      </section>
    );
  }

  const isMedication = normalized.caseType === "Medication";

  return (
    <section
      className={`rounded-2xl border-2 bg-white shadow-sm ${
        isMedication ? "border-purple-300" : "border-blue-300"
      }`}
    >
      <div
        className={`rounded-t-2xl border-b p-6 ${
          isMedication
            ? "border-purple-200 bg-purple-50"
            : "border-blue-200 bg-blue-50"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p
              className={`text-sm font-bold ${
                isMedication ? "text-purple-700" : "text-blue-700"
              }`}
            >
              Saved Patient Record • {normalized.caseType}
            </p>

            <h2 className="mt-1 text-3xl font-bold text-slate-950">
              {normalized.name}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {normalized.request} • {normalized.insurance}
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={() => setIsEditing((prev) => !prev)}
              className={`rounded-lg border bg-white px-4 py-2 text-sm font-bold ${
                isMedication
                  ? "border-purple-300 text-purple-700 hover:bg-purple-100"
                  : "border-blue-300 text-blue-700 hover:bg-blue-100"
              }`}
            >
              {isEditing ? "Cancel Edit" : "Edit Profile"}
            </button>

            <button
              onClick={() => onDeletePatient(patient.id)}
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
            >
              Delete Profile
            </button>

            <button
              onClick={onBack}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <ResultCard
            label="PA Required"
            value={normalized.priorAuthRequired ? "Yes" : "No"}
            tone={normalized.priorAuthRequired ? "amber" : "green"}
          />

          <ResultCard
            label="AI Score"
            value={`${normalized.displayRiskScore}/100`}
            tone={
              normalized.displayRiskScore === 0
                ? "green"
                : normalized.displayRiskScore >= 70
                  ? "red"
                  : normalized.displayRiskScore >= 40
                    ? "amber"
                    : "green"
            }
          />

          <ResultCard
            label="Review Level"
            value={normalized.displayRiskLabel}
            tone={
              normalized.displayRiskLabel === "High"
                ? "red"
                : normalized.displayRiskLabel === "Medium"
                  ? "amber"
                  : "green"
            }
          />

          <ResultCard
            label="Missing Docs"
            value={normalized.missingDocuments.length}
            tone={normalized.missingDocuments.length > 0 ? "red" : "green"}
          />
        </div>
      </div>

      {isEditing && (
        <div
          className={`border-b p-6 ${
            isMedication
              ? "border-purple-100 bg-purple-50/70"
              : "border-blue-100 bg-blue-50/70"
          }`}
        >
          <EditPatientForm
            draft={draft}
            updateDraft={updateDraft}
            saveDraft={saveDraft}
            saving={saving}
          />
        </div>
      )}

      <div className="border-b border-slate-200 px-6">
        <div className="flex flex-wrap gap-2">
          <PatientTabButton
            active={patientTab === "summary"}
            onClick={() => setPatientTab("summary")}
            color={isMedication ? "purple" : "blue"}
          >
            AI Summary
          </PatientTabButton>

          <PatientTabButton
            active={patientTab === "documents"}
            onClick={() => setPatientTab("documents")}
            color={isMedication ? "purple" : "blue"}
          >
            Documents
          </PatientTabButton>

          <PatientTabButton
            active={patientTab === "history"}
            onClick={() => setPatientTab("history")}
            color={isMedication ? "purple" : "blue"}
          >
            Patient History
          </PatientTabButton>

          <PatientTabButton
            active={patientTab === "caseData"}
            onClick={() => setPatientTab("caseData")}
            color={isMedication ? "purple" : "blue"}
          >
            Case Data
          </PatientTabButton>
        </div>
      </div>

      <div className="p-6">
        {patientTab === "summary" && <AISummaryTab normalized={normalized} />}
        {patientTab === "documents" && (
          <DocumentsTab normalized={normalized} patient={patient} />
        )}
        {patientTab === "history" && (
          <PatientHistoryTab normalized={normalized} patient={patient} />
        )}
        {patientTab === "caseData" && (
          <CaseDataTab normalized={normalized} patient={patient} />
        )}
      </div>
    </section>
  );
}

function EditPatientForm({ draft, updateDraft, saveDraft, saving }) {
  const isMedication = draft.case_type === "Medication";

  return (
    <form onSubmit={saveDraft} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Case Type"
          value={draft.case_type}
          onChange={(v) => {
            updateDraft("case_type", v);
            updateDraft(
              "requested_procedure",
              v === "Medication"
                ? "Medication Prior Authorization"
                : "Lumbar Spine MRI"
            );
            updateDraft("requested_medication", v === "Medication" ? "Humira" : "N/A");
            updateDraft("referral_status", v === "Medication" ? "N/A" : "Incomplete");
          }}
          options={["Imaging", "Medication"]}
        />

        <Input
          label="Patient Name"
          value={draft.patient_name}
          onChange={(v) => updateDraft("patient_name", v)}
        />
        <Input
          label="Age"
          type="number"
          value={draft.age}
          onChange={(v) => updateDraft("age", v)}
        />
        <Input
          label="Symptom Duration Weeks"
          type="number"
          value={draft.symptoms_duration_weeks}
          onChange={(v) => updateDraft("symptoms_duration_weeks", v)}
        />

        {isMedication ? (
          <Select
            label="Medicine"
            value={draft.requested_medication}
            onChange={(v) => updateDraft("requested_medication", v)}
            options={medicineOptions}
          />
        ) : (
          <Select
            label="Procedure"
            value={draft.requested_procedure}
            onChange={(v) => updateDraft("requested_procedure", v)}
            options={[
              "Lumbar Spine MRI",
              "Knee MRI",
              "Shoulder MRI",
              "Cervical Spine MRI",
            ]}
          />
        )}

        <Select
          label="Insurance Provider"
          value={draft.insurance_provider}
          onChange={(v) => updateDraft("insurance_provider", v)}
          options={[
            "BlueCross Mock PPO",
            "Medicare Advantage Mock Plan",
            "Medicaid Mock Managed Care",
            "UnitedCare Mock Commercial",
            "Self-Pay / Unverified Insurance",
          ]}
        />
        <Select
          label="Plan Type"
          value={draft.insurance_plan_type}
          onChange={(v) => updateDraft("insurance_plan_type", v)}
          options={[
            "Commercial PPO",
            "Medicare Advantage Mock Plan",
            "Medicaid Mock Managed Care",
            "Self-Pay / Unverified",
          ]}
        />
        <Select
          label="Referral Status"
          value={draft.referral_status}
          onChange={(v) => updateDraft("referral_status", v)}
          options={["None", "Incomplete", "Justified", "N/A"]}
        />
        <Input
          label="CPT / Diagnosis Code"
          value={draft.diagnosis_code}
          onChange={(v) => updateDraft("diagnosis_code", v)}
          required={false}
        />
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Symptoms / Medical Need
        </span>
        <textarea
          value={draft.symptoms}
          onChange={(e) => updateDraft("symptoms", e.target.value)}
          className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <Checkbox
          label="Eligibility Verified"
          checked={draft.eligibility_verification}
          onChange={(v) => updateDraft("eligibility_verification", v)}
        />
        <Checkbox
          label={isMedication ? "Prescription / Physician Order" : "Physician Order"}
          checked={draft.physician_order}
          onChange={(v) => updateDraft("physician_order", v)}
        />
        <Checkbox
          label="Clinical Notes"
          checked={draft.clinical_notes}
          onChange={(v) => updateDraft("clinical_notes", v)}
        />
        {isMedication ? (
          <>
            <Checkbox
              label="Medication History / Failed Alternatives"
              checked={draft.medication_history}
              onChange={(v) => updateDraft("medication_history", v)}
            />
            <Checkbox
              label="Formulary Exception / Step Therapy Notes"
              checked={draft.formulary_exception}
              onChange={(v) => updateDraft("formulary_exception", v)}
            />
          </>
        ) : (
          <>
            <Checkbox
              label="Conservative Treatment"
              checked={draft.conservative_treatment}
              onChange={(v) => updateDraft("conservative_treatment", v)}
            />
            <Checkbox
              label="Physical Therapy Notes"
              checked={draft.physical_therapy_notes}
              onChange={(v) => updateDraft("physical_therapy_notes", v)}
            />
          </>
        )}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving Changes..." : "Save Profile Changes"}
      </button>
    </form>
  );
}

function AISummaryTab({ normalized }) {
  const [riskHelp, setRiskHelp] = useState("");
  const riskFactors = normalized.analysis?.risk_factors || [];
  const activeRiskFactors =
    normalized.displayRiskScore === 0 ? [] : riskFactors;
  const codeReview = getCodeReviewForPatient(normalized);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-semibold text-slate-950">Clinical Summary</h3>
          <p className="mt-2 text-sm text-slate-700">{normalized.symptoms}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-slate-950">AI Score</h3>
            <span className="text-sm text-slate-500">
              {normalized.displayRiskScore}/100
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${
                normalized.displayRiskScore === 0
                  ? "bg-emerald-500"
                  : normalized.displayRiskScore >= 70
                    ? "bg-red-500"
                    : normalized.displayRiskScore >= 40
                      ? "bg-amber-500"
                      : "bg-blue-600"
              }`}
              style={{
                width: `${normalized.displayRiskScore}%`,
              }}
            />
          </div>

          {normalized.displayRiskScore === 0 ? (
            <p className="mt-3 text-sm text-emerald-700">
              All required documentation appears complete. The demo AI score
              is reduced to 0/100.
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Score is based on missing documentation, payer friction, and
              authorization readiness.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRiskHelp(riskHelp === "read" ? "" : "read")}
              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              What does this mean?
            </button>
            <button
              type="button"
              onClick={() =>
                setRiskHelp(riskHelp === "breakdown" ? "" : "breakdown")
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Score Breakdown
            </button>
          </div>

          {riskHelp === "read" && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              A lower score means the case looks ready for prior authorization
              submission. A higher score means staff should review missing
              documents, eligibility, diagnosis support, or payer-specific rules
              before submitting.
            </div>
          )}

          {riskHelp === "breakdown" && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
              {activeRiskFactors.length > 0 ? (
                <div className="space-y-3">
                  {activeRiskFactors.map((factor, index) => (
                    <div
                      key={index}
                      className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-950">
                          {factor.factor_name}
                        </p>
                        <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                          +{factor.points_added}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {factor.reason}
                      </p>
                      <p className="mt-1 text-xs font-medium text-blue-700">
                        {factor.recommended_fix}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-800">
                    No active score points are contributing to the displayed
                    score.
                  </p>
                  <p className="mt-1 text-sm text-emerald-700">
                    The case is showing 0/100 because all required
                    documentation appears complete for this demo workflow.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-semibold text-slate-950">Missing Documents</h3>

          {normalized.missingDocuments.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {normalized.missingDocuments.map((doc, index) => (
                <li
                  key={index}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {doc}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              No missing documents detected.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="font-semibold text-blue-900">
            Staff Recommendation
          </h3>
          <p className="mt-2 text-sm text-blue-800">
            {normalized.missingDocuments.length === 0
              ? "Proceed with authorization submission. Documentation appears complete for this demo workflow."
              : normalized.recommendedAction ||
                "Request missing documentation before submitting prior authorization."}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-semibold text-slate-950">
            Payer Policy Summary
          </h3>
          <p className="mt-2 text-sm text-slate-700">
            {normalized.payerPolicySummary ||
              "Prior authorization may be required. Supporting documentation should show medical necessity, diagnosis code, payer-specific requirements, and relevant clinical history."}
          </p>
        </div>

        {codeReview?.isMismatch && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <h3 className="font-semibold text-red-900">CPT Code Review</h3>
            <p className="mt-2 text-sm text-red-700">
              The submitted code <strong>{codeReview.enteredCode}</strong> does
              not match the mock CPT/code suggestions for{" "}
              <strong>{codeReview.requestLabel}</strong>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {codeReview.suggestions.map((code) => (
                <span
                  key={code}
                  className="rounded-full border border-red-200 bg-white px-3 py-1 text-sm font-semibold text-red-700"
                >
                  Suggested: {code}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs font-medium text-red-600">
              Mock coding guidance only. Staff should verify the final billing
              code before submission.
            </p>
          </div>
        )}
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
        <p className="mt-1 text-sm text-slate-500">
          These are the documents staff has already collected.
        </p>

        <div className="mt-4 space-y-2">
          {uploadedDocs.length > 0 ? (
            uploadedDocs.map((doc) => (
              <div
                key={doc}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              >
                ✓ {doc}
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
              No uploaded documents were detected.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="font-semibold text-slate-950">Required / Missing</h3>
        <p className="mt-1 text-sm text-slate-500">
          Items below should be collected before submission.
        </p>

        <div className="mt-4 space-y-2">
          {normalized.missingDocuments.length > 0 ? (
            normalized.missingDocuments.map((doc) => (
              <div
                key={doc}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                Missing {doc}
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              All required documents appear complete.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PatientHistoryTab({ normalized, patient }) {
  const docs = patient?.documents || {};
  const completedDocs = Object.entries(docs)
    .filter(([, value]) => value)
    .map(([key]) => formatLabel(key));
  const stillNeededItems = normalized.missingDocuments || [];
  const diagnosisMissing = !patient?.diagnosis_code;
  const referralNeedsAttention = ["Incomplete", "None"].includes(
    patient?.referral_status
  );
  const medicationName =
    normalized.caseType === "Medication"
      ? normalized.request.replace("Medication Prior Authorization - ", "")
      : "";

  const historyItems = [
    {
      title: "Requested care",
      detail:
        normalized.caseType === "Medication"
          ? `${normalized.name} is requesting prior authorization for ${
              medicationName || normalized.request
            }.`
          : `${normalized.name} is requesting ${normalized.request}.`,
    },
    {
      title: "Clinical need",
      detail: `${normalized.symptoms} Duration: ${
        patient?.symptoms_duration_weeks || "Unknown"
      } week(s).`,
    },
    {
      title: "Diagnosis and referral",
      detail: (
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 ${
              diagnosisMissing
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            Diagnosis: {patient?.diagnosis_code || "Not provided"}
          </span>
          <span
            className={`rounded-full px-3 py-1 ${
              referralNeedsAttention
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            Referral: {patient?.referral_status || "N/A"}
          </span>
        </div>
      ),
    },
    {
      title: "Insurance profile",
      detail: `${normalized.insurance}. Plan type: ${
        patient?.plan_type || "Unknown"
      }. Eligibility ${patient?.eligibility_verified ? "verified" : "not verified"}.`,
    },
    {
      title: "Documentation on file",
      detail:
        completedDocs.length > 0
          ? completedDocs.join(", ")
          : "No supporting documents marked complete yet.",
    },
    {
      title: "Still needed",
      detail:
        stillNeededItems.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {stillNeededItems.map((item) => (
              <span
                key={item}
                className="rounded-full border border-red-200 bg-white px-3 py-1 text-sm font-semibold text-red-700"
              >
                {item}
              </span>
            ))}
          </div>
        ) : (
          "Nothing else is needed right now. The checklist appears complete."
        ),
      tone: stillNeededItems.length > 0 ? "red" : "green",
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="font-semibold text-slate-950">Patient History</h3>
      <p className="mt-1 text-sm text-slate-500">
        Intake-based profile details collected for this authorization request.
      </p>

      <div className="mt-5 space-y-4">
        {historyItems.map((item, index) => (
          <div key={index} className="flex gap-4">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                item.tone === "red"
                  ? "bg-red-600"
                  : item.tone === "green"
                    ? "bg-emerald-600"
                    : "bg-blue-600"
              }`}
            >
              {index + 1}
            </div>

            <div
              className={`rounded-xl border p-4 ${
                item.tone === "red"
                  ? "border-red-200 bg-red-50"
                  : item.tone === "green"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white"
              }`}
            >
              <p
                className={`font-semibold ${
                  item.tone === "red"
                    ? "text-red-900"
                    : item.tone === "green"
                      ? "text-emerald-900"
                      : "text-slate-950"
                }`}
              >
                {item.title}
              </p>
              <div
                className={`mt-1 text-sm ${
                  item.tone === "red"
                    ? "text-red-700"
                    : item.tone === "green"
                      ? "text-emerald-700"
                      : "text-slate-600"
                }`}
              >
                {item.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CaseDataTab({ normalized, patient }) {
  const analysis = patient?.analysis || {};
  const docs = patient?.documents || patient?.documents_provided || {};

  const rows = [
    ["Patient Name", normalized.name],
    ["Age", patient?.age ?? "N/A"],
    ["Case Type", normalized.caseType],
    ["Request", normalized.request],
    ["Insurance", normalized.insurance],
    ["Plan Type", patient?.plan_type || patient?.insurance_plan_type || "N/A"],
    ["Referral Status", patient?.referral_status || "N/A"],
    ["Diagnosis Code", patient?.diagnosis_code || "Missing"],
    ["Symptoms", normalized.symptoms],
    ["Prior Authorization Required", normalized.priorAuthRequired ? "Yes" : "No"],
    ["AI Score", `${normalized.displayRiskScore}/100`],
    ["Review Level", normalized.displayRiskLabel],
    ["Missing Document Count", normalized.missingDocuments.length],
    [
      "Staff Recommendation",
      normalized.missingDocuments.length === 0
        ? "Proceed with authorization submission."
        : normalized.recommendedAction ||
          "Request missing documentation before submission.",
    ],
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="font-semibold text-slate-950">Case Data</h3>
        <p className="mt-1 text-sm text-slate-500">
          Investor-friendly view of the key data saved for this patient.
        </p>

        <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-2 p-4 md:grid-cols-3">
              <p className="text-sm font-bold text-slate-500">{label}</p>
              <p className="text-sm text-slate-900 md:col-span-2">
                {String(value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="font-semibold text-slate-950">Document Status</h3>
        <p className="mt-1 text-sm text-slate-500">
          Clean document readiness view instead of raw code.
        </p>

        <div className="mt-4 space-y-2">
          {Object.keys(docs).length > 0 ? (
            Object.entries(docs).map(([key, value]) => (
              <div
                key={key}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  value
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {value ? "✓" : "Missing"} {formatLabel(key)}
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              Document details are summarized in the Documents tab.
            </p>
          )}
        </div>

        {analysis?.payer_policy_summary && (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-900">
              Payer Policy Summary
            </p>
            <p className="mt-2 text-sm text-blue-800">
              {analysis.payer_policy_summary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function OperationsQueue({ patients, openExistingPatient, onDeletePatient }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">
          Saved Patient Queue
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Click a patient to jump back up and open their dedicated patient
          record.
        </p>

        <PatientTable
          patients={patients}
          openExistingPatient={openExistingPatient}
          onDeletePatient={onDeletePatient}
        />
      </div>
    </section>
  );
}

function PatientTable({ patients, openExistingPatient, onDeletePatient }) {
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredPatients = patients.filter((patient) => {
    const normalized = normalizePatient(patient);
    const searchableText = [
      normalized.name,
      normalized.request,
      normalized.caseType,
      normalized.insurance,
      normalized.displayRiskLabel,
      normalized.status,
      `${normalized.displayRiskScore}/100`,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearch);
  });

  return (
    <div className="mt-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="relative w-full max-w-md">
          <span className="sr-only">Search saved patients</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient, request, insurance, status..."
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-500">
            ⌕
          </span>
        </label>

        <p className="text-sm font-medium text-slate-500">
          Showing {filteredPatients.length} of {patients.length}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-3">Patient</th>
              <th className="p-3">Request</th>
              <th className="p-3">Type</th>
              <th className="p-3">Insurance</th>
              <th className="p-3">AI Score</th>
              <th className="p-3">Review Level</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {patients.length === 0 ? (
              <tr>
                <td className="p-4 text-slate-500" colSpan="8">
                  No patients loaded yet.
                </td>
              </tr>
            ) : filteredPatients.length === 0 ? (
              <tr>
                <td className="p-4 text-slate-500" colSpan="8">
                  No saved patients match your search.
                </td>
              </tr>
            ) : (
              filteredPatients.map((patient) => {
                const normalized = normalizePatient(patient);
                const isMedication = normalized.caseType === "Medication";

                return (
                  <tr
                    key={patient.id}
                    onClick={() => openExistingPatient(patient)}
                    className="cursor-pointer border-t border-slate-200 hover:bg-slate-50"
                  >
                    <td className="p-3 font-medium text-slate-900">
                      {normalized.name}
                    </td>
                    <td className="p-3">{normalized.request}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          isMedication
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {normalized.caseType}
                      </span>
                    </td>
                    <td className="p-3">{normalized.insurance}</td>
                    <td className="p-3">{normalized.displayRiskScore}/100</td>
                    <td className="p-3">{normalized.displayRiskLabel}</td>
                    <td className="p-3">{normalized.status}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePatient?.(patient.id);
                        }}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function patientToEditableForm(patient) {
  if (!patient) return imagingDemoPatient;

  const normalized = normalizePatient(patient);
  const docs = patient.documents || {};
  const medicationMatch = normalized.request.match(/-\s*(.+)$/);
  const requestedMedication =
    normalized.caseType === "Medication"
      ? medicationMatch?.[1] ||
        normalized.request.replace("Medication Prior Authorization", "").trim() ||
        "Humira"
      : "N/A";

  return {
    case_type: normalized.caseType,
    patient_name: normalized.name,
    age: String(patient.age || ""),
    symptoms: String(patient.symptoms || "").replace(
      /\s*Requested medication:.+$/i,
      ""
    ),
    symptoms_duration_weeks: String(patient.symptoms_duration_weeks || ""),
    requested_procedure:
      normalized.caseType === "Medication"
        ? "Medication Prior Authorization"
        : normalized.request,
    requested_medication: requestedMedication,
    insurance_provider: normalized.insurance,
    insurance_plan_type: patient.plan_type || "Commercial PPO",
    referral_status: patient.referral_status || "N/A",
    diagnosis_code: patient.diagnosis_code || "",
    eligibility_verification: Boolean(docs.eligibility_verification),
    physician_order: Boolean(docs.physician_order),
    clinical_notes: Boolean(docs.clinical_notes),
    conservative_treatment: Boolean(docs.conservative_treatment),
    physical_therapy_notes: Boolean(docs.physical_therapy_notes),
    medication_history: Boolean(docs.conservative_treatment),
    formulary_exception: Boolean(docs.physical_therapy_notes),
  };
}

function getCodeReviewForForm(form) {
  const requestLabel =
    form.case_type === "Medication"
      ? form.requested_medication
      : form.requested_procedure;

  return getCodeReview({
    code: form.diagnosis_code,
    requestLabel,
  });
}

function getCodeReviewForPatient(normalized) {
  return getCodeReview({
    code: normalized.diagnosisCode,
    requestLabel:
      normalized.caseType === "Medication"
        ? normalized.request.replace("Medication Prior Authorization - ", "")
        : normalized.request,
  });
}

function getCodeReview({ code, requestLabel }) {
  const enteredCode = String(code || "").trim().toUpperCase();
  const suggestions = mockCodeGuidance[requestLabel] || [];

  if (!enteredCode || suggestions.length === 0) return null;

  return {
    enteredCode,
    requestLabel,
    suggestions,
    isMismatch: !suggestions.includes(enteredCode),
  };
}

function normalizePatient(patient) {
  const analysis = patient?.analysis || {};
  const request =
    patient?.procedure_name ||
    patient?.requested_procedure ||
    "Authorization Request";

  const lowerRequest = String(request).toLowerCase();

  const caseType =
    lowerRequest.includes("medication") ||
    lowerRequest.includes("medicine") ||
    medicineOptions.some((med) => lowerRequest.includes(med.toLowerCase()))
      ? "Medication"
      : "Imaging";

  const missingDocuments = analysis?.missing_documents || [];
  const rawRiskScore =
    analysis?.initial_risk_score ?? analysis?.risk_score ?? 45;
  const displayRiskScore = missingDocuments.length === 0 ? 0 : rawRiskScore;

  const rawRiskLabel =
    analysis?.initial_denial_risk || analysis?.denial_risk || "Medium";
  const displayRiskLabel = missingDocuments.length === 0 ? "Low" : rawRiskLabel;

  return {
    id: patient?.id,
    name: patient?.name || patient?.patient_name || "Unknown Patient",
    request,
    caseType,
    insurance:
      patient?.provider || patient?.insurance_provider || "Unknown Insurance",
    diagnosisCode: patient?.diagnosis_code || patient?.diagnosisCode || "",
    symptoms: patient?.symptoms || "No symptoms available.",
    status: patient?.status || "Pending Review",
    analysis,
    missingDocuments,
    rawRiskScore,
    displayRiskScore,
    rawRiskLabel,
    displayRiskLabel,
    priorAuthRequired:
      analysis?.prior_authorization_required === undefined
        ? true
        : analysis?.prior_authorization_required,
    recommendedAction: Array.isArray(analysis?.recommended_actions)
      ? analysis.recommended_actions[0]
      : analysis?.recommended_action,
    payerPolicySummary: analysis?.payer_policy_summary,
  };
}

function getCompletedDocsFromForm(form) {
  const docs = [];

  if (form.eligibility_verification) docs.push("Eligibility Verified");
  if (form.physician_order) {
    docs.push("Physician Order");
    docs.push("Prescription / Physician Order");
  }
  if (form.clinical_notes) docs.push("Clinical Notes");
  if (form.diagnosis_code) docs.push("Diagnosis Code");

  if (form.case_type === "Medication") {
    if (form.medication_history) {
      docs.push("Medication History / Failed Alternatives");
    }
    if (form.formulary_exception) {
      docs.push("Formulary Exception / Step Therapy Notes");
    }
  } else {
    if (form.conservative_treatment) docs.push("Conservative Treatment");
    if (form.physical_therapy_notes) docs.push("Physical Therapy Notes");
  }

  return docs;
}

function getUploadedDocsFromPatient(patient, normalized) {
  const analysis = patient?.analysis || {};
  const missing = normalized.missingDocuments || [];
  const required =
    requiredDocsByCaseType[normalized.caseType] || requiredDocsByCaseType.Imaging;

  const uploadedFromRequired = required.filter((doc) => {
    return !missing.some((missingDoc) =>
      String(missingDoc).toLowerCase().includes(doc.toLowerCase())
    );
  });

  const backendDocs = analysis?.documents_provided || analysis?.provided_documents;

  if (Array.isArray(backendDocs)) {
    return [...new Set([...uploadedFromRequired, ...backendDocs])];
  }

  return uploadedFromRequired;
}

function formatLabel(key) {
  return String(key)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value ?? 0}</p>
    </div>
  );
}

function PreviewRow({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = true,
  invalid = false,
  inputRef,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition ${
          invalid
            ? "border-red-400 ring-4 ring-red-100 focus:border-red-500 focus:ring-red-100"
            : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        }`}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.includes(value) ? value : options[0];

  function chooseOption(option) {
    onChange(option);
    setOpen(false);
  }

  return (
    <div className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <div
        className="relative"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setOpen(false);
          }
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 shadow-sm outline-none transition ${
            open
              ? "border-blue-500 ring-4 ring-blue-100"
              : "border-slate-300 hover:border-blue-300 hover:bg-blue-50/30"
          }`}
        >
          <span>{selectedOption}</span>
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition ${
              open ? "rotate-180 bg-blue-100 text-blue-700" : ""
            }`}
          >
            ▾
          </span>
        </button>

        {open && (
          <div className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            {options.map((option) => {
              const selected = option === selectedOption;

              return (
                <button
                  key={option}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => chooseOption(option)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                    selected
                      ? "bg-blue-600 text-white"
                      : "text-slate-700 hover:bg-blue-50 hover:text-blue-800"
                  }`}
                >
                  <span>{option}</span>
                  {selected && <span>✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
      {label}
    </label>
  );
}

function ResultCard({ label, value, tone }) {
  const styles = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <div className={`rounded-xl border p-5 ${styles[tone] || styles.green}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function PatientTabButton({ active, onClick, children, color = "blue" }) {
  const activeClass =
    color === "purple"
      ? "border-purple-600 text-purple-700"
      : "border-blue-600 text-blue-700";

  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-4 py-3 text-sm font-semibold ${
        active
          ? activeClass
          : "border-transparent text-slate-500 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

