function scoreStyles(score) {
  if (score >= 85) {
    return {
      badge: "bg-green-100 text-green-700",
      border: "border-green-200",
    };
  }

  if (score >= 60) {
    return {
      badge: "bg-yellow-100 text-yellow-800",
      border: "border-yellow-200",
    };
  }

  return {
    badge: "bg-red-100 text-red-700",
    border: "border-red-200",
  };
}

function FlagPill({ label, value }) {
  if (typeof value !== "boolean") {
    return null;
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        value ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {label}: {value ? "Yes" : "No"}
    </span>
  );
}

export default function CandidateTable({ candidates = [] }) {
  if (!candidates.length) {
    return null;
  }

  return (
    <section className="rounded-3xl bg-white shadow-md">
      <div className="border-b border-slate-200 px-6 py-5">
        <h3 className="text-lg font-semibold text-slate-900">Top Candidates</h3>
        <p className="mt-1 text-sm text-slate-500">Review the ranked package matches returned by the agent.</p>
      </div>

      <div className="space-y-4 p-6">
        {candidates.map((candidate) => {
          const styles = scoreStyles(candidate.score ?? 0);
          const rationale = candidate.why_this_rank || candidate.score_breakdown || "No ranking explanation provided.";

          return (
            <article
              key={`${candidate.rank}-${candidate.insuranceid}`}
              className={`rounded-2xl border bg-slate-50 p-5 ${styles.border}`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Rank {candidate.rank}</span>
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${styles.badge}`}>
                      Score {candidate.score ?? "-"}
                    </span>
                  </div>
                  <h4 className="mt-3 text-xl font-semibold text-slate-900">{candidate.insuranceplanname}</h4>
                  <p className="mt-1 text-sm text-slate-500">Athena ID: {candidate.insuranceid || "-"}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <FlagPill label="Product Family" value={candidate.product_family_match} />
                  <FlagPill label="Exchange" value={candidate.exchange_match} />
                </div>
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Found In Pool</dt>
                  <dd className="mt-1 text-sm text-slate-800">{candidate.found_in_pool || candidate.affiliationname || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Source Call</dt>
                  <dd className="mt-1 text-sm text-slate-800">{candidate.source_call || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">State</dt>
                  <dd className="mt-1 text-sm text-slate-800">{candidate.state || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Display Name</dt>
                  <dd className="mt-1 text-sm text-slate-800">{candidate.insuranceplandisplayname || "-"}</dd>
                </div>
              </dl>

              <details className="mt-5 rounded-xl bg-white p-4" open={candidate.rank === 1}>
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">Scoring Breakdown</summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{rationale}</p>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
