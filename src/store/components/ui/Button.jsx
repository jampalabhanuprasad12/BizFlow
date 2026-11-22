const BASE =
  "inline-flex items-center justify-center rounded-xl font-medium transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

const VARIANTS = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
  secondary:
    "bg-white border border-slate-200 text-navy-900 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100",
  danger: "bg-red-600 hover:bg-red-700 text-white",
};

const SIZES = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  children,
  className = "",
  ...rest
}) {
  const classes = [BASE, VARIANTS[variant] ?? VARIANTS.primary, SIZES[size] ?? SIZES.md, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={classes} {...rest}>
      {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      {children}
    </button>
  );
}
