import { NavLink } from "react-router-dom";
import { Zap } from "lucide-react";
import { navItems } from "./navigation.js";

export default function Sidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200/70 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-sm">
          <Zap className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div className="leading-tight">
          <p className="text-base font-bold text-navy-900">BizFlow</p>
          <p className="text-xs text-slate-500">Back Office</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main navigation">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={() => onNavigate?.()}
            className={({ isActive }) =>
              [
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-smooth",
                isActive
                  ? "bg-blue-50 font-semibold text-blue-700 before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r before:bg-blue-600"
                  : "text-slate-600 hover:bg-slate-100 hover:text-navy-900",
              ].join(" ")
            }
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
