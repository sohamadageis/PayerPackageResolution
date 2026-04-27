import StatusBadge from "./StatusBadge";

function formatFieldLabel(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatBoolean(value) {
  if (typeof value !== "boolean") {
    return null;
  }

  return value ? "Yes" : "No";
}

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{value ?? "-"}</dd>
    </div>
  );
}

function getSelectedPackage(result) {
  if (result.selected_package) {
    return result.selected_package;
  }

  if (Array.isArray(result.top_candidates) && result.top_candidates.length > 0) {
    return result.top_candidates.find((candidate) => candidate.rank === 1) || result.top_candidates[0];
  }

  return null;
}

function buildSummaryItems(result) {
  return [
    ["Resolved Payer", result.resolved_payer_name],
    ["Plan Type", result.plan_type_detected],
    ["Insurance Subtype", result.insurance_subtype],
    ["Product Family", result.product_family],
    ["Derived Region", result.derived_region],
    ["Search Strategy", result.search_strategy_used],
    ["Exchange Inferred", formatBoolean(result.exchange_inferred)],
    ["Sub-Plan Keyword", result.sub_plan_keyword],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");
}

export default function ResultCard({ result, onStartOver }) {
  const {
    decision,
    confidence_score,
    explanation,
    extracted_card_fields,
  } = result;
  const selectedPackage = getSelectedPackage(result);
  const summaryItems = buildSummaryItems(result);
  const selectedRationale = selectedPackage?.why_selected || selectedPackage?.score_breakdown;

  return (
    <section className="space-y-6 rounded-3xl bg-white p-6 shadow-md sm:p-8">
      <StatusBadge decision={decision} confidence_score={confidence_score} />

      {(decision === "auto_assign" || decision === "manual_review") && selectedPackage ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Selected Package</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{selectedPackage.insuranceplanname}</h2>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <DetailRow label="Athena Package ID" value={selectedPackage.insuranceid} />
            <DetailRow label="Score" value={selectedPackage.score} />
            <DetailRow label="Found In Pool" value={selectedPackage.found_in_pool || selectedPackage.affiliationname} />
            <DetailRow label="Source Call" value={selectedPackage.source_call} />
          </dl>
          {selectedRationale ? (
            <details className="mt-5 rounded-xl bg-white p-4" open>
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">Why this package?</summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">{selectedRationale}</p>
            </details>
          ) : null}
        </div>
      ) : null}

      {decision === "no_match" ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700">
          No matching package found. Please assign manually.
        </div>
      ) : null}

      {summaryItems.length ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">Decision Summary</h3>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {summaryItems.map(([label, value]) => (
              <DetailRow key={label} label={label} value={value} />
            ))}
          </dl>
        </section>
      ) : null}

      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-5" open>
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">Full Explanation</summary>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{explanation || "No explanation returned."}</p>
      </details>

      {extracted_card_fields ? (
        <details className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
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
        className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
      >
        Start Over
      </button>
    </section>
  );
}
