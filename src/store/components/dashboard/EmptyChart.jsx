import { Link } from "react-router-dom";

export function EmptyChart({ icon: Icon, title, description, to, actionLabel = "Add records" }) {
  return (
    <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 px-6 py-8 text-center">
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      {title && <h3 className="text-base font-semibold text-navy-900">{title}</h3>}
      {description && <p className="mt-1 max-w-xs text-sm text-slate-500">{description}</p>}
      {to && (
        <Link
          to={to}
          className="mt-4 inline-flex h-8 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-medium text-white shadow-sm transition-smooth hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
