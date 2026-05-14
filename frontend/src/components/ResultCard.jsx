import StatusBadge from "./StatusBadge";

function formatFieldLabel(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{value ?? "-"}</dd>
    </div>
  );
}

function InsurancePackageCard({ title, insurance, tone }) {
  if (!insurance?.insuranceplanname || !insurance?.insuranceid) {
    return null;
  }

  const toneClasses =
    tone === "primary"
      ? "border-emerald-200/70 bg-[linear-gradient(145deg,_rgba(236,253,245,0.96),_rgba(209,250,229,0.7))]"
      : "border-sky-200/70 bg-[linear-gradient(145deg,_rgba(240,249,255,0.96),_rgba(224,242,254,0.72))]";

  const labelClasses =
    tone === "primary"
      ? "text-emerald-700"
      : "text-sky-700";

  return (
    <article className={`overflow-hidden rounded-[1.6rem] border p-5 shadow-sm ${toneClasses}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${labelClasses}`}>{title}</p>
          <h3 className="mt-3 text-xl font-bold leading-tight text-slate-900">{insurance.insuranceplanname}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${tone === "primary" ? "bg-white/80 text-emerald-700" : "bg-white/80 text-sky-700"}`}>
          {tone === "primary" ? "Priority" : "Linked"}
        </span>
      </div>
      <p className="mt-5 text-sm text-slate-600">
        Insurance ID: <span className="text-lg font-semibold text-slate-900">{insurance.insuranceid}</span>
      </p>
    </article>
  );
}

function getFallbackPrimaryInsurance(result) {
  if (result.primary_insurance?.insuranceplanname && result.primary_insurance?.insuranceid) {
    return result.primary_insurance;
  }

  if (Array.isArray(result.top_candidates) && result.top_candidates.length > 0) {
    const rankOne = result.top_candidates.find((candidate) => candidate.rank === 1) || result.top_candidates[0];

    if (!rankOne) {
      return null;
    }

    return {
      insuranceid: rankOne.insuranceid,
      insuranceplanname: rankOne.insuranceplanname,
    };
  }

  return null;
}

export default function ResultCard({ result, onStartOver }) {
  const { decision, extracted_card_fields, secondary_insurance } = result;
  const primaryInsurance = getFallbackPrimaryInsurance(result);
  const hasInsuranceCards = primaryInsurance || (secondary_insurance?.insuranceplanname && secondary_insurance?.insuranceid);

  return (
    <section className="space-y-6 rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
      <StatusBadge decision={decision} />

      {(decision === "auto_assign" || decision === "manual_review") && hasInsuranceCards ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Insurance Packages</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InsurancePackageCard title="Primary Insurance" insurance={primaryInsurance} tone="primary" />
            <InsurancePackageCard title="Secondary Insurance" insurance={secondary_insurance} tone="secondary" />
          </div>
        </section>
      ) : null}

      {decision === "no_match" ? (
        <div className="rounded-[1.6rem] border border-red-100 bg-[linear-gradient(145deg,_rgba(254,242,242,0.96),_rgba(254,226,226,0.72))] p-5 text-red-700 shadow-sm">
          No matching package found. Please assign manually.
        </div>
      ) : null}

      {extracted_card_fields ? (
        <details className="rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(248,250,252,0.96),_rgba(255,255,255,0.92))] p-5 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">Extracted Card Fields</summary>
          <dl className="mt-4 grid gap-3">
            {Object.entries(extracted_card_fields).map(([key, value]) => (
              <DetailRow key={key} label={formatFieldLabel(key)} value={value} />
            ))}
          </dl>
        </details>
      ) : null}

      <button
        type="button"
        onClick={onStartOver}
        className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#0f172a,_#312e81_45%,_#0369a1)] px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(49,46,129,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(49,46,129,0.32)]"
      >
        Start Over
      </button>
    </section>
  );
}
