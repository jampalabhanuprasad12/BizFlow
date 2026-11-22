const TONES = {
  green: "bg-green-50 text-green-700 ring-green-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  purple: "bg-purple-50 text-purple-700 ring-purple-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

const STATUS_TONE = {
  paid: "green",
  overdue: "red",
  warning: "orange",
  pending: "blue",
  sent: "purple",
  scheduled: "purple",
  draft: "slate",
};

export function StatusBadge({ status }) {
  const key = String(status ?? "");
  const tone = TONES[STATUS_TONE[key.toLowerCase()] ?? "slate"];
  const label = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}
    >
      {label}
    </span>
  );
}
