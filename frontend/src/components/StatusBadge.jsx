function getDecisionConfig(decision) {
  switch (decision) {
    case "auto_assign":
      return {
        label: "Auto-Assigned",
        badgeClass: "bg-green-50 text-green-700 ring-green-200",
      };
    case "manual_review":
      return {
        label: "Needs Review",
        badgeClass: "bg-yellow-50 text-yellow-800 ring-yellow-200",
      };
    default:
      return {
        label: "No Match Found",
        badgeClass: "bg-red-50 text-red-700 ring-red-200",
      };
  }
}

function getBarColor(score) {
  if (score >= 85) {
    return "bg-green-500";
  }

  if (score >= 60) {
    return "bg-yellow-500";
  }

  return "bg-red-500";
}

export default function StatusBadge({ decision, confidence_score = 0 }) {
  const config = getDecisionConfig(decision);
  const boundedScore = Math.max(0, Math.min(100, Number(confidence_score) || 0));

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ${config.badgeClass}`}>
          {config.label}
        </span>
        <div className="min-w-48 flex-1 sm:max-w-xs">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
            <span>Confidence</span>
            <span className="font-semibold text-slate-900">{boundedScore}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full rounded-full transition-all ${getBarColor(boundedScore)}`} style={{ width: `${boundedScore}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
