export function Card({ title, description, action, children, className = "" }) {
  const hasHeader = Boolean(title || action);

  return (
    <section className={`card-surface p-5 sm:p-6 ${className}`.trim()}>
      {hasHeader && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold text-navy-900">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
