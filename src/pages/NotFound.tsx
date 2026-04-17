import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Compass, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-4">
      <div className="gradient-mesh fixed inset-0 pointer-events-none" />
      <div className="relative w-full max-w-2xl glass rounded-3xl border border-border/50 p-8 md:p-12 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Compass className="h-8 w-8" />
        </div>

        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Error 404
        </p>
        <h1 className="text-4xl md:text-5xl font-bold mb-3 text-foreground">
          Page not found
        </h1>
        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
          Jo page aap dhoond rahe hain woh available nahi hai ya move ho chuka
          hai. Aap homepage par wapas ja sakte hain.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Home className="h-4 w-4" />
            Go to Home
          </Link>
          <Link
            to="/plans"
            className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-background/60 px-5 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Explore Plans
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-foreground break-all">
          Requested path:{" "}
          <span className="text-foreground">{location.pathname}</span>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
