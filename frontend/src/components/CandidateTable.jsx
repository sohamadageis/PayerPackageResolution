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

function getRankLabel(rank) {
  if (rank === 1) {
    return "Rank 1";
  }

  if (rank === 2) {
    return "Rank 2";
  }

  if (rank === 3) {
    return "Rank 3";
  }

  return `Rank ${rank}`;
}

export default function CandidateTable({ candidates = [] }) {
  if (!candidates.length) {
    return null;
  }

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/88 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="border-b border-slate-200/80 px-6 py-5">
        <h3 className="text-xl font-semibold text-slate-900">Other Potential Packages</h3>
      </div>

      <div className="space-y-4 p-6">
        {candidates.map((candidate) => {
          const styles = scoreStyles(candidate.score ?? 0);

          return (
            <article
              key={`${candidate.rank}-${candidate.insuranceid}`}
              className={`rounded-[1.5rem] border bg-[linear-gradient(180deg,_rgba(248,250,252,0.96),_rgba(255,255,255,0.92))] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${styles.border}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {getRankLabel(candidate.rank)}
                  </p>
                  <h4 className="mt-3 text-lg font-semibold leading-tight text-slate-900">{candidate.insuranceplanname || "-"}</h4>
                  <p className="mt-3 text-sm text-slate-600">
                    Insurance ID: <span className="text-lg font-semibold text-slate-900">{candidate.insuranceid || "-"}</span>
                  </p>
                </div>

                <span className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-sm ${styles.badge}`}>
                  {candidate.score ?? 0}%
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
