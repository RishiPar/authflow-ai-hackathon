"use client";

import { useState, useEffect } from "react";
import { 
  Activity, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  ArrowUpRight, 
  Plus, 
  ShieldAlert, 
  ArrowRight, 
  Database, 
  Sparkles, 
  RefreshCw,
  Info,
  ExternalLink,
  Shield,
  Layers,
  FileCheck
} from "lucide-react";

export default function Page() {
  // Application Data States
  const [patients, setPatients] = useState([]);
  const [metrics, setMetrics] = useState({
    total_patients: 0,
    high_risk_cases: 0,
    prior_auth_required_count: 0,
    missing_documents_count: 0,
    estimated_time_saved_hours: 0,
    estimated_delay_avoided_days: 0,
    estimated_denial_risk_reduction_pct: 0
  });
  const [policies, setPolicies] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Form States
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [symptomsDuration, setSymptomsDuration] = useState("");
  const [procedure, setProcedure] = useState("Lumbar Spine MRI");
  const [insurance, setInsurance] = useState("BlueCross Mock PPO");
  const [planType, setPlanType] = useState("Commercial PPO");
  const [referralStatus, setReferralStatus] = useState("None");
  const [diagnosisCode, setDiagnosisCode] = useState("");
  const [eligibilityVerified, setEligibilityVerified] = useState(false);
  const [physicianOrder, setPhysicianOrder] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState(false);
  const [conservativeTx, setConservativeTx] = useState(false);
  const [ptNotes, setPtNotes] = useState(false);

  // App UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const API_BASE = "http://127.0.0.1:8000/api";

  const loadData = async () => {
    try {
      // 1. Fetch Patients
      const patientsRes = await fetch(`${API_BASE}/patients`);
      if (!patientsRes.ok) throw new Error("Could not load patients list.");
      const patientsData = await patientsRes.json();
      setPatients(patientsData);

      // Auto-select first patient if none selected
      if (patientsData.length > 0 && !selectedPatient) {
        setSelectedPatient(patientsData[0]);
      } else if (selectedPatient) {
        // Refresh selected patient
        const updatedSelected = patientsData.find(p => p.id === selectedPatient.id);
        if (updatedSelected) {
          setSelectedPatient(updatedSelected);
        }
      }

      // 2. Fetch Metrics
      const metricsRes = await fetch(`${API_BASE}/dashboard-metrics`);
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      // 3. Fetch Policies
      const policiesRes = await fetch(`${API_BASE}/payer-policies`);
      if (policiesRes.ok) {
        const policiesData = await policiesRes.json();
        setPolicies(policiesData);
      }

      // 4. Fetch Audit Logs
      const logsRes = await fetch(`${API_BASE}/audit-log`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setAuditLogs(logsData);
      }

      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to sync with FastAPI backend server on port 8000. Ensure server is running.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePatientSelect = (p) => {
    setSelectedPatient(p);
  };

  const handleDocumentToggle = async (docKey, currentValue) => {
    if (!selectedPatient) return;
    
    // Optimistic UI update
    const patchPayload = { [docKey]: !currentValue };
    
    try {
      const res = await fetch(`${API_BASE}/patients/${selectedPatient.id}/documents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchPayload)
      });
      
      if (!res.ok) throw new Error("Failed to modify checklist state.");
      
      const updatedPatient = await res.json();
      setSelectedPatient(updatedPatient);
      
      // Refresh listings
      const patientsRes = await fetch(`${API_BASE}/patients`);
      if (patientsRes.ok) setPatients(await patientsRes.json());
      
      const metricsRes = await fetch(`${API_BASE}/dashboard-metrics`);
      if (metricsRes.ok) setMetrics(await metricsRes.json());

      const logsRes = await fetch(`${API_BASE}/audit-log`);
      if (logsRes.ok) setAuditLogs(await logsRes.json());
      
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update database.");
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg("");

    const payload = {
      patient_name: patientName,
      age: parseInt(age) || 0,
      symptoms: symptoms,
      symptoms_duration_weeks: parseInt(symptomsDuration) || 0,
      requested_procedure: procedure,
      insurance_provider: insurance,
      insurance_plan_type: planType,
      referral_status: referralStatus,
      diagnosis_code: diagnosisCode || null,
      documents_provided: {
        insurance_card: true,
        eligibility_verification: eligibilityVerified,
        physician_order: physicianOrder,
        diagnosis_code_doc: !!diagnosisCode,
        clinical_notes: clinicalNotes,
        referral: referralStatus === "Justified",
        conservative_treatment: conservativeTx,
        physical_therapy_notes: ptNotes,
        prior_auth_form: false,
        payer_policy_reference: false
      }
    };

    try {
      const response = await fetch(`${API_BASE}/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("API call failed. Check payload details.");
      }

      const newPatient = await response.json();
      setSuccessMsg(`Patient ${newPatient.name} added to operations queue successfully.`);
      
      // Reset form fields
      setPatientName("");
      setAge("");
      setSymptoms("");
      setSymptomsDuration("");
      setDiagnosisCode("");
      setEligibilityVerified(false);
      setPhysicianOrder(false);
      setClinicalNotes(false);
      setConservativeTx(false);
      setPtNotes(false);

      // Auto-select the newly created patient
      setSelectedPatient(newPatient);

      // Sync Lists
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to submit patient intake.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 text-gray-900 min-h-screen flex flex-col font-sans pb-12">
      
      {/* 1. Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-xs px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-950">
                AuthFlow AI <span className="text-gray-400 font-normal">|</span> Intelligent Healthcare Operations Assistant
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                AI-powered patient access, prior authorization, and revenue cycle support for hospitals and outpatient clinics.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={loadData}
              className="p-2 text-gray-500 hover:text-blue-600 rounded-lg border border-gray-250 hover:bg-gray-50 transition"
              title="Refresh Queue"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <span className="text-xs px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-bold uppercase tracking-wider">
              MVP Operations Panel
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto w-full px-4 mt-6 space-y-6">

        {/* 2. Safety and Compliance Banner */}
        <section className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-xs">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-850 text-sm">
                Safety & Compliance Notice
              </h3>
              <p className="text-xs text-amber-800 mt-1">
                Demo uses synthetic/mock data only. Not for clinical use. Human review required before submission.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 mt-2 text-[11px] text-amber-700 list-disc pl-4">
                <li>No real patient Protected Health Information (PHI) is processed or stored.</li>
                <li>System supports operational decisions only; does not generate medical diagnosis predictions.</li>
                <li>Not medical advice. Does not determine final insurance coverage or guarantee payer approval.</li>
                <li>Designed for future HIPAA-aware deployment, but this demo does not claim formal compliance.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. Hospital Integration Banner */}
        <section className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-xl shadow-xs">
          <div className="flex items-start gap-3">
            <Layers className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-900 text-sm">
                Hospital System Integration Active
              </h3>
              <p className="text-xs text-blue-800 mt-1">
                AuthFlow AI is configured with standard integration APIs. Rather than replacing existing hospital workflows, it intercepts intake data, computes operational denial risk, and sends structural checklists back to your EHR or billing console.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Dashboard Summary Metrics */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
            Operations Queue Performance Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
              <span className="text-[10px] text-gray-500 block uppercase font-semibold">Total cases</span>
              <span className="text-xl font-extrabold text-gray-900 block mt-1">{metrics.total_patients}</span>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
              <span className="text-[10px] text-red-600 block uppercase font-semibold">High risk</span>
              <span className="text-xl font-extrabold text-red-700 block mt-1">{metrics.high_risk_cases}</span>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
              <span className="text-[10px] text-blue-600 block uppercase font-semibold">PA Required</span>
              <span className="text-xl font-extrabold text-blue-700 block mt-1">{metrics.prior_auth_required_count}</span>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
              <span className="text-[10px] text-amber-600 block uppercase font-semibold">Missing Docs</span>
              <span className="text-xl font-extrabold text-amber-700 block mt-1">{metrics.missing_documents_count}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
              <span className="text-[10px] text-emerald-600 block uppercase font-semibold">Time Saved</span>
              <span className="text-xl font-extrabold text-emerald-700 block mt-1">{metrics.estimated_time_saved_hours}h</span>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
              <span className="text-[10px] text-indigo-600 block uppercase font-semibold">Delays avoided</span>
              <span className="text-xl font-extrabold text-indigo-700 block mt-1">{metrics.estimated_delay_avoided_days}d</span>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
              <span className="text-[10px] text-purple-600 block uppercase font-semibold">Risk averted</span>
              <span className="text-xl font-extrabold text-purple-700 block mt-1">-{metrics.estimated_denial_risk_reduction_pct}%</span>
            </div>
          </div>
        </section>

        {/* Error Notification */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
            <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">System Sync Interrupted</h4>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* 5. Patient Intake Form */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-950 flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-blue-600" />
            Operational Patient Intake Portal
          </h2>
          
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-850 px-4 py-3 rounded-lg text-xs font-semibold mb-4">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Patient Name</label>
                <input 
                  type="text" 
                  value={patientName} 
                  onChange={(e) => setPatientName(e.target.value)} 
                  required 
                  placeholder="e.g. Elena Garcia" 
                  className="w-full bg-gray-55 border border-gray-250 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-lg px-3 py-2 text-sm outline-none transition" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Age</label>
                <input 
                  type="number" 
                  value={age} 
                  onChange={(e) => setAge(e.target.value)} 
                  required 
                  placeholder="e.g. 44" 
                  className="w-full bg-gray-55 border border-gray-250 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-lg px-3 py-2 text-sm outline-none transition" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Symptom Duration (Weeks)</label>
                <input 
                  type="number" 
                  value={symptomsDuration} 
                  onChange={(e) => setSymptomsDuration(e.target.value)} 
                  required 
                  placeholder="e.g. 6" 
                  className="w-full bg-gray-55 border border-gray-250 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-lg px-3 py-2 text-sm outline-none transition" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Clinical Intake symptoms</label>
                <input 
                  type="text" 
                  value={symptoms} 
                  onChange={(e) => setSymptoms(e.target.value)} 
                  required 
                  placeholder="e.g. Neck pain radiating down left arm for 6 weeks" 
                  className="w-full bg-gray-55 border border-gray-250 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-lg px-3 py-2 text-sm outline-none transition" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Diagnosis Code / ICD-10 (If known)</label>
                <input 
                  type="text" 
                  value={diagnosisCode} 
                  onChange={(e) => setDiagnosisCode(e.target.value)} 
                  placeholder="e.g. M50.21 (Optional)" 
                  className="w-full bg-gray-55 border border-gray-250 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-lg px-3 py-2 text-sm outline-none transition" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Procedure</label>
                <select 
                  value={procedure} 
                  onChange={(e) => setProcedure(e.target.value)}
                  className="w-full bg-gray-55 border border-gray-250 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-lg px-3 py-2 text-sm outline-none transition cursor-pointer"
                >
                  <option value="Lumbar Spine MRI">Lumbar Spine MRI</option>
                  <option value="Knee MRI">Knee MRI</option>
                  <option value="Shoulder MRI">Shoulder MRI</option>
                  <option value="Cervical Spine MRI">Cervical Spine MRI</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Insurance Provider</label>
                <select 
                  value={insurance} 
                  onChange={(e) => setInsurance(e.target.value)}
                  className="w-full bg-gray-55 border border-gray-250 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-lg px-3 py-2 text-sm outline-none transition cursor-pointer"
                >
                  <option value="BlueCross Mock PPO">BlueCross Mock PPO</option>
                  <option value="Medicare Advantage Mock Plan">Medicare Advantage Mock Plan</option>
                  <option value="Medicaid Mock Managed Care">Medicaid Mock Managed Care</option>
                  <option value="UnitedCare Mock Commercial">UnitedCare Mock Commercial</option>
                  <option value="Self-Pay / Unverified Insurance">Self-Pay / Unverified Insurance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Plan type</label>
                <select 
                  value={planType} 
                  onChange={(e) => setPlanType(e.target.value)}
                  className="w-full bg-gray-55 border border-gray-250 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-lg px-3 py-2 text-sm outline-none transition cursor-pointer"
                >
                  <option value="Commercial PPO">Commercial PPO</option>
                  <option value="Medicare Advantage Mock Plan">Medicare Advantage Mock Plan</option>
                  <option value="Medicaid Mock Managed Care">Medicaid Mock Managed Care</option>
                  <option value="Self-Pay / Unverified Insurance">Self-Pay / Unverified</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Referral Status</label>
                <select 
                  value={referralStatus} 
                  onChange={(e) => setReferralStatus(e.target.value)}
                  className="w-full bg-gray-55 border border-gray-250 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-lg px-3 py-2 text-sm outline-none transition cursor-pointer"
                >
                  <option value="None">None</option>
                  <option value="Incomplete">Incomplete</option>
                  <option value="Justified">Justified</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>
            </div>

            {/* Checklist of initial attachments */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-2">Initial Documents Attached</span>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                  <input type="checkbox" checked={eligibilityVerified} onChange={(e) => setEligibilityVerified(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  <span>Eligibility Verified</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                  <input type="checkbox" checked={physicianOrder} onChange={(e) => setPhysicianOrder(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  <span>Physician Order</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                  <input type="checkbox" checked={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  <span>Clinical Notes</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                  <input type="checkbox" checked={conservativeTx} onChange={(e) => setConservativeTx(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  <span>Conservative Tx</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                  <input type="checkbox" checked={ptNotes} onChange={(e) => setPtNotes(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  <span>PT Notes</span>
                </label>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2.5 px-6 rounded-lg text-sm shadow-xs transition duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Filing Intake Case...
                </>
              ) : "Create Intake Record & Run Analysis"}
            </button>
          </form>
        </section>

        {/* 6. Saved Patient Queue */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-950 flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-blue-600" />
            Hospital Patient Operations Queue
          </h2>
          <div className="overflow-x-auto border border-gray-150 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Procedure</th>
                  <th className="p-3">Insurance Payer</th>
                  <th className="p-3">Risk Level</th>
                  <th className="p-3">PA Req.</th>
                  <th className="p-3">Operational Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  const isSelected = selectedPatient && selectedPatient.id === p.id;
                  const risk = p.analysis ? p.analysis.initial_denial_risk : "Low";
                  
                  return (
                    <tr 
                      key={p.id} 
                      onClick={() => handlePatientSelect(p)}
                      className={`border-b border-gray-150 hover:bg-blue-50/35 cursor-pointer transition ${
                        isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-600 font-semibold' : ''
                      }`}
                    >
                      <td className="p-3 text-gray-900 font-bold">{p.name} (Age {p.age})</td>
                      <td className="p-3 text-gray-700">{p.procedure_name}</td>
                      <td className="p-3 text-gray-700">{p.provider}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          risk === 'High' ? 'bg-red-50 text-red-700 border border-red-200' :
                          risk === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-255'
                        }`}>
                          {risk}
                        </span>
                      </td>
                      <td className="p-3 text-gray-700">
                        {p.analysis && p.analysis.prior_authorization_required ? "Yes" : "No"}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          p.status === 'Ready to Submit' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          p.status === 'High Risk' ? 'bg-red-50 text-red-700 border border-red-100' :
                          p.status === 'Needs Eligibility Verification' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button className="text-blue-600 font-bold hover:underline flex items-center gap-1.5 ml-auto text-[11px]">
                          Select <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {selectedPatient && (
          <div className="space-y-6">

            {/* 7. Selected Patient Details */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-150 pb-4 mb-4 gap-2">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">
                    Operations Summary: {selectedPatient.name}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    CPT Procedure: <strong className="text-gray-700">{selectedPatient.procedure_name}</strong> • Symptom Duration: <strong className="text-gray-700">{selectedPatient.symptoms_duration_weeks} Weeks</strong>
                  </p>
                </div>
                <div className="text-xs text-gray-400 font-mono">
                  Database Case Reference: ID-{selectedPatient.id}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-gray-700">
                <div>
                  <span className="block text-gray-400 font-bold uppercase tracking-wider text-[10px]">Patient Age</span>
                  <span className="text-sm font-bold text-gray-800 mt-0.5 block">{selectedPatient.age} Years Old</span>
                </div>
                <div>
                  <span className="block text-gray-400 font-bold uppercase tracking-wider text-[10px]">Payer Provider</span>
                  <span className="text-sm font-bold text-gray-800 mt-0.5 block">{selectedPatient.provider} ({selectedPatient.plan_type})</span>
                </div>
                <div>
                  <span className="block text-gray-400 font-bold uppercase tracking-wider text-[10px]">Clinic Symptoms Notes</span>
                  <span className="text-sm block text-gray-800 mt-0.5 font-medium italic">"{selectedPatient.symptoms}"</span>
                </div>
              </div>
            </section>

            {/* 8. Insurance and Payer Policy Analysis */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
                Insurance Coverage & Policy Grounding Rules
              </h3>
              
              {selectedPatient.analysis ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-700 font-bold text-xs mb-2">
                      <FileCheck className="h-4 w-4" />
                      <span>{selectedPatient.analysis.policy_reference || "Mock Coverage Reference"}</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed font-medium">
                      {selectedPatient.analysis.payer_policy_summary}
                    </p>
                  </div>
                  <div className="bg-blue-50/50 border border-blue-200/50 rounded-xl p-3.5 flex items-start gap-2.5">
                    <Database className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      <strong>RAG Vector Ingestion Alert:</strong> Payer policy parameters are retrieved from the local configuration index. Future production version: Payer medical necessity bulletins can be loaded dynamically into ChromaDB and retrieved utilizing LangChain's vector search algorithms.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic">No insurance analysis logs saved for this patient.</div>
              )}
            </section>

            {/* 9. AI Operational Risk Analysis */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
                Prior Authorization Operational Risk Evaluation
              </h3>

              {selectedPatient.analysis ? (
                <div className="space-y-6">
                  
                  {/* Gauge Bar */}
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                      <span className="text-gray-500">Intake Audit Denial/Delay Risk Score</span>
                      <span className={`text-sm ${
                        selectedPatient.analysis.initial_risk_score >= 66 ? 'text-red-600' :
                        selectedPatient.analysis.initial_risk_score >= 31 ? 'text-amber-600' :
                        'text-emerald-600'
                      }`}>
                        {selectedPatient.analysis.initial_risk_score} / 100 ({selectedPatient.analysis.initial_denial_risk})
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          selectedPatient.analysis.initial_risk_score >= 66 ? 'bg-red-505 bg-red-500' :
                          selectedPatient.analysis.initial_risk_score >= 31 ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${selectedPatient.analysis.initial_risk_score}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Active Risk Factors */}
                  <div>
                    <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                      Identified Denial/Delay Risk Factors ({selectedPatient.analysis.risk_factors.length})
                    </span>
                    <div className="space-y-3">
                      {selectedPatient.analysis.risk_factors.map((factor, idx) => (
                        <div key={idx} className="bg-gray-55 border border-gray-200 rounded-xl p-3.5 text-xs">
                          <div className="flex justify-between items-center font-bold text-gray-900 border-b border-gray-200 pb-1.5 mb-2">
                            <span>{factor.factor_name}</span>
                            <span className="text-red-600">+{factor.points_added} Points</span>
                          </div>
                          <p className="text-gray-700 leading-relaxed font-medium">
                            <strong>Reason:</strong> {factor.reason}
                          </p>
                          <p className="text-blue-700 leading-relaxed font-semibold mt-1 flex items-center gap-1">
                            <strong>Action needed:</strong> {factor.recommended_fix}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-xs text-gray-400 italic">Audit calculations not populated.</div>
              )}
            </section>

            {/* 10. Missing Documents Checklist */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="border-b border-gray-150 pb-3 mb-4">
                <h3 className="text-base font-bold text-gray-950">
                  Interactive Clinical Documentation Audit Checklist
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Check boxes when files are received/verified. The AI risk score and delay metrics recalculate dynamically.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  { label: "Insurance Card", key: "insurance_card" },
                  { label: "Eligibility Verification", key: "eligibility_verification" },
                  { label: "Physician Order", key: "physician_order" },
                  { label: "Diagnosis Code Document", key: "diagnosis_code_doc" },
                  { label: "Clinical Consult Notes", key: "clinical_notes" },
                  { label: "Referral Justification Letter", key: "referral" },
                  { label: "Conservative Treatment History", key: "conservative_treatment" },
                  { label: "Physical Therapy Notes", key: "physical_therapy_notes" },
                  { label: "Payer Prior Auth Form", key: "prior_auth_form" },
                  { label: "Payer Policy Reference", key: "payer_policy_reference" }
                ].map((doc) => {
                  const isChecked = selectedPatient.documents[doc.key];
                  
                  return (
                    <label 
                      key={doc.key} 
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer select-none transition ${
                        isChecked 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-850 font-bold' 
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {isChecked ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-gray-400 shrink-0" />
                        )}
                        <span>{doc.label}</span>
                      </span>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => handleDocumentToggle(doc.key, isChecked)}
                        className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                      />
                    </label>
                  );
                })}
              </div>
            </section>

            {/* 11. Staff Action Plan */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
                Actionable Staff Resolution Plan
              </h3>
              {selectedPatient.analysis ? (
                <ol className="list-decimal pl-5 space-y-2.5 text-xs text-gray-800">
                  {selectedPatient.analysis.recommended_actions.map((act, i) => (
                    <li key={i} className="font-semibold leading-relaxed">
                      {act}
                    </li>
                  ))}
                  <li className="text-amber-700 font-bold leading-relaxed list-none border-t border-amber-100 pt-2 mt-2">
                    * Final Human verification is mandatory before clinical submission.
                  </li>
                </ol>
              ) : (
                <div className="text-xs text-gray-400 italic">No recommendations loaded.</div>
              )}
            </section>

            {/* 12. Operational Impact / Risk Averted */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
                Operational Impact & Denial Averted Metrics
              </h3>
              
              {selectedPatient.analysis ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Before vs After */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col justify-between">
                      <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Denial Risk Audit Score Impact</span>
                      <div className="flex items-center justify-around">
                        <div className="text-center">
                          <span className="text-xs text-gray-500 font-semibold uppercase">Initial Score</span>
                          <span className="text-2xl font-extrabold text-red-600 mt-1 block">
                            {selectedPatient.analysis.initial_risk_score}
                          </span>
                        </div>
                        <div className="p-1.5 bg-blue-100 text-blue-700 rounded-full">
                          <ArrowRight className="h-5 w-5" />
                        </div>
                        <div className="text-center">
                          <span className="text-xs text-gray-500 font-semibold uppercase">Projected Score</span>
                          <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">
                            {selectedPatient.analysis.projected_risk_after_actions}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delay Days & Time Averted */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3.5 text-xs text-gray-700">
                      <div className="flex justify-between items-center font-semibold border-b border-gray-200 pb-1.5">
                        <span>Denial Risk Reduced</span>
                        <span className="text-emerald-700 font-bold text-sm">-{selectedPatient.analysis.estimated_risk_reduction_percent} Points</span>
                      </div>
                      <div className="flex justify-between items-center font-semibold border-b border-gray-200 pb-1.5">
                        <span>Estimated Administrative Time Saved</span>
                        <span className="text-blue-700 font-bold">{selectedPatient.analysis.estimated_time_saved_minutes} Minutes</span>
                      </div>
                      <div className="flex justify-between items-center font-semibold">
                        <span>Payer Scheduling Delays Avoided</span>
                        <span className="text-indigo-700 font-bold">{selectedPatient.analysis.estimated_delay_avoided_days}</span>
                      </div>
                    </div>

                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl text-xs font-semibold text-emerald-850">
                    <strong>Impact summary:</strong> {selectedPatient.analysis.risk_averted_summary}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic">No impact metrics evaluated.</div>
              )}
            </section>

          </div>
        )}

        {/* 13. Integration Readiness Section */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-extrabold text-gray-950 flex items-center gap-2 mb-3">
            <Database className="h-5 w-5 text-blue-600" />
            Hospital EHR System Integration Architecture
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed mb-4">
            AuthFlow AI is designed as a modular plug-and-play middleware. It queries payer coverage guidelines asynchronously, parses documentation checklists, and updates diagnostic records without requiring you to replace your existing workflows.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-800 mb-6">
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <strong className="block text-gray-900 mb-1">Supported Standards:</strong>
              <ul className="list-disc pl-4 space-y-1 text-gray-700">
                <li>FHIR-style API integration (Fast Healthcare Interoperability Resources)</li>
                <li>HL7-style electronic data transfer interfaces</li>
                <li>API endpoints supporting direct patient intake JSON payloads</li>
                <li>Secure CSV batch data imports and exports</li>
              </ul>
            </div>
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <strong className="block text-gray-900 mb-1">Operational Event Hooks:</strong>
              <ul className="list-disc pl-4 space-y-1 text-gray-700">
                <li>Automated Webhooks transmitting denial risk alerts</li>
                <li>Real-time database updates logs</li>
                <li>Human Review checklist verification triggers</li>
                <li>Pre-visit clearance checks before scheduling</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-100/80 rounded-xl p-4 text-center border border-gray-200">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Integration Data Flow Diagram</div>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 text-xs font-semibold text-gray-700">
              <div className="bg-white px-3.5 py-2 border border-gray-200 rounded-lg shadow-xs">Existing Hospital EHR</div>
              <ArrowRight className="h-4 w-4 text-blue-600 rotate-90 sm:rotate-0" />
              <div className="bg-blue-600 px-3.5 py-2 text-white border border-blue-700 rounded-lg shadow-xs">AuthFlow API Layer</div>
              <ArrowRight className="h-4 w-4 text-blue-600 rotate-90 sm:rotate-0" />
              <div className="bg-white px-3.5 py-2 border border-gray-200 rounded-lg shadow-xs">AI/RAG Policy Engine</div>
              <ArrowRight className="h-4 w-4 text-blue-600 rotate-90 sm:rotate-0" />
              <div className="bg-gray-250 px-3.5 py-2 border border-gray-300 rounded-lg shadow-xs">Checklist & Action Plan</div>
            </div>
          </div>
        </section>

        {/* 14. Medicaid Support Section */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-extrabold text-gray-950 flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-blue-600" />
            Medicaid & Managed Care Support
          </h3>
          <div className="text-xs text-gray-600 space-y-3 leading-relaxed">
            <p>
              Medicaid rules and prior authorization requirements vary significantly by state and managed care organization (MCO). AuthFlow AI provides custom mock templates mapped to Medicaid criteria to ensure compliance.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <strong className="block text-gray-900 text-xs mb-1.5">Mock Medicaid Policy Guidelines (MED-SHOULDER-2026A):</strong>
              <ul className="list-disc pl-4 space-y-1 text-gray-700 text-[11px]">
                <li>Prior authorization is mandatory for all high-cost joint MRI procedures.</li>
                <li>Pre-submission eligibility verification is required on the state Medicaid database.</li>
                <li>Must confirm assignment to the correct Managed Care Organization.</li>
                <li>Signed physician order, diagnosis codes, and clinical progress notes must be attached.</li>
                <li>Requires human review confirmation before authorization packet is submitted.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 15. Value Proposition */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-extrabold text-gray-950 flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Why Hospitals Would Use AuthFlow AI
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700 leading-relaxed font-semibold">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <span>Reduces avoidable prior authorization delay times by catching document gaps early.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <span>Detects missing clinical order, diagnosis, and notes details prior to billing submittal.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <span>Helps prevent claim denials caused by unverified or inactive insurance coverage.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <span>Saves administrative staff time by summarizing policy documents into actionable checklists.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <span>Protects patients from care delays and unexpected billing liabilities.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <span>Adds an AI intelligence layer without replacing your existing hospital database infrastructures.</span>
            </div>
          </div>
        </section>

        {/* 16. Audit Log and Human Review Section */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-extrabold text-gray-950 flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-blue-600" />
            Audit Trail Logs & Human Verification Log
          </h3>

          <div className="space-y-4">
            
            {/* selected patient audit logs */}
            {selectedPatient && (
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Chronological Operations Log: {selectedPatient.name}
                </span>
                <div className="bg-gray-55 border border-gray-200 rounded-xl p-3 max-h-[160px] overflow-y-auto space-y-2">
                  {auditLogs.filter(log => log.patient_id === selectedPatient.id).length > 0 ? (
                    auditLogs
                      .filter(log => log.patient_id === selectedPatient.id)
                      .map((log) => (
                        <div key={log.id} className="text-xs leading-relaxed text-gray-700 flex justify-between gap-4 py-1 border-b border-gray-150 last:border-0">
                          <div>
                            <strong className="text-gray-900 uppercase text-[9px] bg-gray-200 px-1.5 py-0.5 rounded mr-2 inline-block">
                              {log.action}
                            </strong>
                            <span>{log.details}</span>
                          </div>
                          <span className="text-gray-400 shrink-0 font-mono text-[10px]">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))
                  ) : (
                    <div className="text-xs text-gray-400 italic">No audit trail entries for this patient.</div>
                  )}
                </div>
              </div>
            )}

            {/* Global system disclaimers */}
            <div className="border-t border-gray-200 pt-4 text-center">
              <p className="text-[11px] text-gray-400">
                AuthFlow AI Operational Verification Log System • Active Database Connection: SQLite (mock_cases.db)
              </p>
              <div className="p-3 bg-red-50/50 border border-red-200/50 rounded-xl text-[10px] text-gray-500 mt-2 leading-relaxed">
                <strong>Safety Verification Disclaimer:</strong> {selectedPatient?.analysis?.disclaimer || "AuthFlow AI does not provide medical advice, determine final insurance coverage, guarantee payer approval, or replace staff review."}
              </div>
            </div>

          </div>
        </section>

      </div>

      <footer className="text-center text-xs text-gray-400 mt-12">
        AuthFlow AI Operations Dashboard Prototype • Synthetic Healthcare Operations Demo
      </footer>
    </div>
  );
}
