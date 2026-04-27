import { useEffect, useRef, useState } from "react";
import axios from "axios";

import CandidateTable from "./components/CandidateTable";
import LoadingSpinner from "./components/LoadingSpinner";
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
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 shadow-lg">
        <div className="flex items-start gap-3">
          <p className="flex-1 text-sm font-medium">{message}</p>
          <button type="button" onClick={onDismiss} className="text-sm font-semibold">
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
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${styles[status] || styles.idle}`}>
      {status}
    </span>
  );
}

export default function App() {
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [patientState, setPatientState] = useState("");
  const [patientZip, setPatientZip] = useState("");
  const [practiceState, setPracticeState] = useState("");
  const [jobId, setJobId] = useState("");
  const [jobStatus, setJobStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please upload an insurance card image first.");
      return;
    }

    setError("");
    setResult(null);
    setJobId("");
    setJobStatus("uploading");

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      if (patientState) {
        formData.append("patientState", patientState);
      }

      if (patientZip) {
        formData.append("patientZip", patientZip);
      }

      if (practiceState) {
        formData.append("practiceState", practiceState);
      }

      const response = await api.post("/process-insurance", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setJobId(response.data.job_id);
      setJobStatus(response.data.status);
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

        if (nextStatus === "completed") {
          setResult(response.data.result);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setSelectedFile(null);
    setPatientState("");
    setPatientZip("");
    setPracticeState("");
    setJobId("");
    setJobStatus("idle");
    setResult(null);
    setError("");
  }

  const isLoading = jobStatus === "uploading" || jobStatus === "processing";

  return (
    <div className="min-h-screen px-4 py-10">
      <Toast message={error} onDismiss={() => setError("")} />
      <LoadingSpinner visible={isLoading} />

      <main className="mx-auto max-w-5xl space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-r from-sky-100 via-indigo-100 to-emerald-100 opacity-80" />
          <div className="absolute -right-16 top-10 h-40 w-40 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-emerald-200/40 blur-3xl" />

          <div className="relative">
            <p className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-white">
              Payer Resolution
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Payer Package Resolution
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Just upload insurance card and wait for magic!
            </p>

          </div>

          <form className="relative mt-8 space-y-5 rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-5 shadow-sm sm:p-6" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-slate-700">
              Insurance Card Image
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:font-semibold file:text-indigo-700"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-sm font-semibold text-slate-700">
                Patient State
                <select
                  value={patientState}
                  onChange={(event) => setPatientState(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                >
                  <option value="">Optional</option>
                  {STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Patient ZIP
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={patientZip}
                  onChange={(event) => setPatientZip(event.target.value)}
                  placeholder="Optional"
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Practice State
                <select
                  value={practiceState}
                  onChange={(event) => setPracticeState(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                >
                  <option value="">Optional</option>
                  {STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-sky-600 disabled:cursor-not-allowed disabled:from-indigo-300 disabled:to-sky-300"
              >
                {isLoading ? "Processing..." : "Process Insurance"}
              </button>
              <button
                type="button"
                onClick={resetFlow}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </form>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Job ID</p>
              <p className="mt-2 break-all text-sm text-slate-800">{jobId || "No job started yet"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status</p>
              <div className="mt-2">
                <StatusPill status={jobStatus} />
              </div>
            </div>
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
