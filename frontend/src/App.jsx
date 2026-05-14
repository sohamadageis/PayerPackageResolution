import { useEffect, useRef, useState } from "react";
import axios from "axios";

import CandidateTable from "./components/CandidateTable";
import ResultCard from "./components/ResultCard";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
});

const STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

function Toast({ message, onDismiss }) {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-50 max-w-md animate-fade-in">
      <div className="overflow-hidden rounded-3xl border border-red-200/70 bg-white/95 px-4 py-4 text-red-900 shadow-[0_24px_80px_rgba(239,68,68,0.18)] backdrop-blur">
        <div className="mb-3 h-1.5 rounded-full bg-gradient-to-r from-red-500 via-rose-500 to-orange-400" />
        <div className="flex items-start gap-3">
          <p className="flex-1 text-sm font-medium">{message}</p>
          <button type="button" onClick={onDismiss} className="text-sm font-semibold text-red-700 transition hover:text-red-900">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const styles = {
    idle: "bg-slate-100 text-slate-700",
    uploading: "bg-indigo-100 text-indigo-700",
    processing: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border border-white/70 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] shadow-sm ${
        styles[status] || styles.idle
      }`}
    >
      {status}
    </span>
  );
}

function getWorkflowSteps(uiPathState, workflowHistory = [], jobStatus) {
  const statesSeen = new Set(workflowHistory.map((entry) => entry.state).filter(Boolean));
  const hasAccepted = statesSeen.has("Accepted");
  const hasRunning = statesSeen.has("Pending") || statesSeen.has("Running");
  const isFailed = jobStatus === "failed";
  const isCompleted = jobStatus === "completed";

  return [
    {
      key: "accepted",
      label: "Accepted",
      description: "Submission received",
      isDone: hasAccepted,
      isActive: hasAccepted && !hasRunning && !isCompleted && !isFailed,
    },
    {
      key: "running",
      label: "Running",
      description: "Agent is processing",
      isDone: hasRunning || isCompleted || isFailed,
      isActive: !isCompleted && !isFailed && (uiPathState === "Pending" || uiPathState === "Running"),
    },
    {
      key: "completed",
      label: isFailed ? "Failed" : "Completed",
      description: isFailed ? "Processing ended with an error" : "Result is ready",
      isDone: isCompleted || isFailed,
      isActive: isCompleted || isFailed,
    },
  ];
}

function WorkflowTimeline({ jobStatus, uiPathState, workflowHistory }) {
  const steps = getWorkflowSteps(uiPathState, workflowHistory, jobStatus);

  return (
    <div className="rounded-[1.6rem] border border-white/80 bg-white/78 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workflow Status</p>
          <p className="mt-1 text-sm text-slate-600">Live processing state for the current submission.</p>
        </div>
        <StatusPill status={jobStatus} />
      </div>

      <div className="mt-7 flex flex-col gap-7 md:flex-row md:items-start md:justify-between">
        {steps.map((step, index) => {
          const circleClass = step.isActive
            ? "border-indigo-500 bg-indigo-500 ring-4 ring-indigo-100"
            : step.isDone
              ? "border-emerald-500 bg-emerald-500"
              : "border-slate-300 bg-white";
          const titleClass = step.isActive
            ? "text-indigo-900"
            : step.isDone
              ? "text-emerald-900"
              : "text-slate-900";
          const descriptionClass = step.isActive
            ? "text-indigo-600"
            : step.isDone
              ? "text-emerald-600"
              : "text-slate-500";

          return (
            <div key={step.key} className="relative flex flex-1 flex-col">
              <div className="mb-[-6px] pl-11">
                <p className={`text-sm font-semibold leading-none ${titleClass}`}>{step.label}</p>
              </div>

              <div className="relative flex items-center">
              {index < steps.length - 1 ? (
                <div
                  className={`absolute left-7 right-[-2rem] top-1/2 hidden h-[2px] -translate-y-1/2 md:block ${
                    step.isDone ? "bg-gradient-to-r from-emerald-300 to-emerald-200" : "bg-gradient-to-r from-slate-300 to-slate-200"
                  }`}
                />
              ) : null}
              <span className={`relative z-10 inline-flex h-9 w-9 shrink-0 rounded-full border-2 transition ${circleClass}`} />
              </div>

              <div className="mt-[-6px] pl-11">
                <p className={`text-xs leading-5 ${descriptionClass}`}>{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const pollRef = useRef(null);
  const insuranceFrontFileInputRef = useRef(null);
  const insuranceBackFileInputRef = useRef(null);
  const secondaryFrontFileInputRef = useRef(null);
  const secondaryBackFileInputRef = useRef(null);
  const [insuranceFrontFile, setInsuranceFrontFile] = useState(null);
  const [insuranceBackFile, setInsuranceBackFile] = useState(null);
  const [secondaryFrontFile, setSecondaryFrontFile] = useState(null);
  const [secondaryBackFile, setSecondaryBackFile] = useState(null);
  const [patientState, setPatientState] = useState("");
  const [patientZip, setPatientZip] = useState("");
  const [practiceState, setPracticeState] = useState("");
  const [jobId, setJobId] = useState("");
  const [jobStatus, setJobStatus] = useState("idle");
  const [uiPathState, setUiPathState] = useState("");
  const [uiPathSubState, setUiPathSubState] = useState("");
  const [workflowHistory, setWorkflowHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const isLocked = jobStatus === "uploading" || jobStatus === "processing";

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setResult(null);
    setJobId("");
    setJobStatus("uploading");
    setUiPathState("");
    setUiPathSubState("");
    setWorkflowHistory([]);

    if (!patientState) {
      setJobStatus("idle");
      setError("Patient State is required.");
      return;
    }

    if (!patientZip.trim()) {
      setJobStatus("idle");
      setError("Patient ZIP is required.");
      return;
    }

    if (!/^\d{5}(?:-\d{4})?$/.test(patientZip.trim())) {
      setJobStatus("idle");
      setError("Patient ZIP must be a valid ZIP code.");
      return;
    }

    if (!practiceState) {
      setJobStatus("idle");
      setError("Practice State is required.");
      return;
    }

    try {
      const formData = new FormData();

      if (insuranceFrontFile) {
        formData.append("insuranceFrontImage", insuranceFrontFile);
      }

      if (insuranceBackFile) {
        formData.append("insuranceBackImage", insuranceBackFile);
      }

      if (secondaryFrontFile) {
        formData.append("secondaryFrontImage", secondaryFrontFile);
      }

      if (secondaryBackFile) {
        formData.append("secondaryBackImage", secondaryBackFile);
      }

      formData.append("patientState", patientState);
      formData.append("patientZip", patientZip.trim());
      formData.append("practiceState", practiceState);

      const response = await api.post("/process-insurance", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setJobId(response.data.job_id);
      setJobStatus(response.data.status);
      setUiPathState(response.data.uiPathState || "");
      setUiPathSubState(response.data.uiPathSubState || "");
      setWorkflowHistory(response.data.workflowHistory || []);
      startPolling(response.data.job_id);
    } catch (submitError) {
      setJobStatus("idle");
      setError(
        submitError.response?.data?.message ||
          submitError.response?.data?.error ||
          "Could not start insurance processing.",
      );
    }
  }

  function startPolling(nextJobId) {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
    }

    pollRef.current = window.setInterval(async () => {
      try {
        const response = await api.get(`/status/${nextJobId}`);
        const nextStatus = response.data.status;

        setJobStatus(nextStatus);
        setUiPathState(response.data.uiPathState || "");
        setUiPathSubState(response.data.uiPathSubState || "");
        setWorkflowHistory(response.data.workflowHistory || []);

        if (nextStatus === "completed") {
          const nextResult = response.data.result || {};
          const coordinationOfBenefitsNotice =
            response.data.coordination_of_benefits_notice ??
            nextResult.coordination_of_benefits_notice ??
            nextResult.coordinationOfBenefitsNotice ??
            nextResult.coordination_of_benefits ??
            nextResult.coordinationOfBenefits ??
            nextResult.cob_notice ??
            nextResult.cobNotice ??
            null;

          setResult({
            ...nextResult,
            ...(coordinationOfBenefitsNotice ? { coordination_of_benefits_notice: coordinationOfBenefitsNotice } : {}),
          });
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }

        if (nextStatus === "failed") {
          setError(response.data.error || "Insurance processing failed.");
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch (pollError) {
        setJobStatus("failed");
        setError(
          pollError.response?.data?.message ||
            pollError.response?.data?.error ||
            "Could not fetch job status.",
        );
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 2000);
  }

  function resetFlow() {
    if (insuranceFrontFileInputRef.current) {
      insuranceFrontFileInputRef.current.value = "";
    }

    if (insuranceBackFileInputRef.current) {
      insuranceBackFileInputRef.current.value = "";
    }

    if (secondaryFrontFileInputRef.current) {
      secondaryFrontFileInputRef.current.value = "";
    }

    if (secondaryBackFileInputRef.current) {
      secondaryBackFileInputRef.current.value = "";
    }

    setInsuranceFrontFile(null);
    setInsuranceBackFile(null);
    setSecondaryFrontFile(null);
    setSecondaryBackFile(null);
    setPatientState("");
    setPatientZip("");
    setPracticeState("");
    setJobId("");
    setJobStatus("idle");
    setUiPathState("");
    setUiPathSubState("");
    setWorkflowHistory([]);
    setResult(null);
    setError("");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(191,219,254,0.55),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_38%,_#f8fafc_100%)] px-4 py-10 sm:px-6">
      <Toast message={error} onDismiss={() => setError("")} />

      <main className="mx-auto max-w-6xl space-y-7">
        <section className="relative overflow-hidden rounded-[2.25rem] border border-white/70 bg-white/78 p-6 shadow-[0_32px_120px_rgba(15,23,42,0.15)] backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-r from-sky-100/90 via-indigo-100/80 to-emerald-100/80" />
          <div className="absolute -right-12 top-8 h-48 w-48 rounded-full bg-indigo-300/25 blur-3xl" />
          <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="absolute right-20 top-24 h-24 w-24 rounded-full border border-white/40 bg-white/20 backdrop-blur-xl" />

          <div className="relative">
            <p className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-white shadow-lg shadow-slate-900/10">
              Payer Resolution
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
              Payer Package Resolution
            </h1>
          </div>

          <form
            className="relative mt-8 space-y-6 rounded-[1.9rem] border border-white/80 bg-white/88 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6 lg:p-7"
            onSubmit={handleSubmit}
          >
            <fieldset disabled={isLocked} className={isLocked ? "pointer-events-none opacity-55" : ""}>
              <div className="space-y-4 rounded-[1.6rem] border border-slate-200/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.95),_rgba(248,250,252,0.88))] p-5 shadow-sm">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Primary Card</h2>
                  <p className="mt-1 text-sm text-slate-600">Upload the main insurance card set used for payer resolution.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
                    Insurance Card Front
                    <input
                      ref={insuranceFrontFileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={(event) => setInsuranceFrontFile(event.target.files?.[0] || null)}
                      className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:font-semibold file:text-indigo-700"
                    />
                    <p className="mt-2 text-xs font-medium text-slate-500">JPG, PNG, or WEBP up to 4MB</p>
                  </label>

                  <label className="block rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
                    Insurance Card Back
                    <input
                      ref={insuranceBackFileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={(event) => setInsuranceBackFile(event.target.files?.[0] || null)}
                      className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:font-semibold file:text-indigo-700"
                    />
                    <p className="mt-2 text-xs font-medium text-slate-500">Optional back image when available</p>
                  </label>
                </div>
              </div>

              <div className="mt-6 space-y-4 rounded-[1.6rem] border border-slate-200/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.95),_rgba(248,250,252,0.88))] p-5 shadow-sm">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Secondary Card</h2>
                  <p className="mt-1 text-sm text-slate-600">Use this for the second card set, like a Medicare or veteran-related secondary card.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:shadow-md">
                    Secondary Card Front
                    <input
                      ref={secondaryFrontFileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={(event) => setSecondaryFrontFile(event.target.files?.[0] || null)}
                      className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:font-semibold file:text-indigo-700"
                    />
                    <p className="mt-2 text-xs font-medium text-slate-500">Optional secondary front image</p>
                  </label>

                  <label className="block rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:shadow-md">
                    Secondary Card Back
                    <input
                      ref={secondaryBackFileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={(event) => setSecondaryBackFile(event.target.files?.[0] || null)}
                      className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:font-semibold file:text-indigo-700"
                    />
                    <p className="mt-2 text-xs font-medium text-slate-500">Optional secondary back image</p>
                  </label>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <label className="block rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm font-semibold text-slate-700 shadow-sm">
                  <span className="inline-flex items-center gap-2">
                    Patient State
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-600">Required</span>
                  </span>
                  <select
                    value={patientState}
                    onChange={(event) => setPatientState(event.target.value)}
                    required
                    className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm"
                  >
                    <option value="">Select state</option>
                    {STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm font-semibold text-slate-700 shadow-sm">
                  <span className="inline-flex items-center gap-2">
                    Patient ZIP
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-600">Required</span>
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={patientZip}
                    onChange={(event) => setPatientZip(event.target.value)}
                    placeholder="Required"
                    required
                    className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm"
                  />
                </label>

                <label className="block rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm font-semibold text-slate-700 shadow-sm">
                  <span className="inline-flex items-center gap-2">
                    Practice State
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-600">Required</span>
                  </span>
                  <select
                    value={practiceState}
                    onChange={(event) => setPracticeState(event.target.value)}
                    required
                    className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm"
                  >
                    <option value="">Select state</option>
                    {STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isLocked}
                  className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#0f172a,_#312e81_45%,_#0369a1)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(49,46,129,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(49,46,129,0.32)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLocked ? "Processing..." : "Process Insurance"}
                </button>
                <button
                  type="button"
                  onClick={resetFlow}
                  disabled={isLocked}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white/95 px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset
                </button>
              </div>
            </fieldset>
          </form>

          <div className="mt-6">
            <WorkflowTimeline
              jobStatus={jobStatus}
              uiPathState={uiPathState}
              uiPathSubState={uiPathSubState}
              workflowHistory={workflowHistory}
            />
          </div>
        </section>

        {result ? (
          <div className="space-y-6">
            <ResultCard result={result} onStartOver={resetFlow} />
            <CandidateTable candidates={result.top_candidates} />
          </div>
        ) : null}
      </main>
    </div>
  );
}
