import { Link } from "react-router-dom";
import { Home } from "lucide-react";

// Same classes as the primary Button, applied to a Link so no <button> is nested in an <a>.
const PRIMARY_LINK_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-xl h-10 px-4 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-bold text-blue-600 sm:text-8xl">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-navy-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        The page you requested does not exist or may have been moved.
      </p>
      <Link to="/" className={`mt-8 ${PRIMARY_LINK_CLASS}`}>
        <Home className="h-4 w-4" aria-hidden="true" />
        Back to dashboard
      </Link>
    </div>
  );
}
