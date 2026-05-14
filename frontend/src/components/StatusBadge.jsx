function getDecisionConfig(decision) {
  switch (decision) {
    case "auto_assign":
      return {
        label: "Auto-Assign",
        badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        panelClass: "border-emerald-200/70 bg-[linear-gradient(135deg,_rgba(236,253,245,0.95),_rgba(209,250,229,0.7))]",
        accentClass: "from-emerald-500 to-green-400",
      };
    case "manual_review":
      return {
        label: "Needs Review",
        badgeClass: "bg-amber-50 text-amber-800 ring-amber-200",
        panelClass: "border-amber-200/70 bg-[linear-gradient(135deg,_rgba(255,251,235,0.95),_rgba(254,243,199,0.72))]",
        accentClass: "from-amber-500 to-yellow-400",
      };
    default:
      return {
        label: "No Match Found",
        badgeClass: "bg-rose-50 text-rose-700 ring-rose-200",
        panelClass: "border-rose-200/70 bg-[linear-gradient(135deg,_rgba(255,241,242,0.95),_rgba(254,205,211,0.72))]",
        accentClass: "from-rose-500 to-red-400",
      };
  }
}

export default function StatusBadge({ decision }) {
  const config = getDecisionConfig(decision);

  return (
    <div className={`overflow-hidden rounded-[1.6rem] border p-5 shadow-sm ${config.panelClass}`}>
      <div className={`mb-4 h-1.5 rounded-full bg-gradient-to-r ${config.accentClass}`} />
      <div className="flex items-center">
        <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ${config.badgeClass}`}>
          {config.label}
        </span>
      </div>
    </div>
  );
}
