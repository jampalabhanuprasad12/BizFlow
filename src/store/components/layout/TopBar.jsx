import { useState } from "react";
import { Bell, ChevronDown, Menu, Search, Zap } from "lucide-react";
import { SearchInput } from "../ui/SearchInput.jsx";

const BUSINESS_NAME = "Bella Beauty Studio";
const OWNER_NAME = "Sofia Alvarez";
const OWNER_INITIALS = "SA";

export default function TopBar({ onMenuClick }) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-smooth hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
            <Zap className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <span className="font-bold text-navy-900">BizFlow</span>
        </div>

        <div className="hidden flex-1 md:block md:max-w-md">
          <SearchInput placeholder="Search customers, invoices…" />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((open) => !open)}
            aria-label="Toggle search"
            aria-expanded={mobileSearchOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-smooth hover:bg-slate-100 md:hidden"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-label="Notifications (3)"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-smooth hover:bg-slate-100"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              3
            </span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-sm font-semibold text-white">
              {OWNER_INITIALS}
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-bold text-navy-900">{BUSINESS_NAME}</p>
              <p className="text-xs text-slate-500">{OWNER_NAME}</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" aria-hidden="true" />
          </div>
        </div>
      </header>

      {mobileSearchOpen && (
        <div className="border-b border-slate-200/70 bg-white px-4 py-3 md:hidden">
          <SearchInput placeholder="Search customers, invoices…" />
        </div>
      )}
    </>
  );
}
