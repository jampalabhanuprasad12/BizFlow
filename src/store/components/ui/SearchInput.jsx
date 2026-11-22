import { Search } from "lucide-react";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
}) {
  return (
    <div className={`relative ${className}`.trim()}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-transparent bg-slate-100 pl-9 pr-3 text-sm text-navy-900 placeholder:text-slate-400 transition-smooth focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
