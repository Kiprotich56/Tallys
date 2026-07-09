import { useEffect, useState } from "react";
import { useSearch, useLocation } from "wouter";
import { Scissors, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "verifying" | "success" | "expired" | "error";

// This page is what the verification email actually links to. It calls the
// API in the background and controls the redirect itself, so the user only
// ever sees the app's own domain — never the bare backend URL — while
// confirming their email.
export default function VerifyEmailPage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<Status>("verifying");

  const token = new URLSearchParams(search).get("token") ?? "";

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
    fetch(`${base}/api/auth/verify-email?token=${encodeURIComponent(token)}`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          setStatus("success");
        } else if (data.error === "expired") {
          setStatus("expired");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md text-center">
        <a href="/" className="inline-flex items-center gap-2 text-primary font-serif font-bold text-2xl mb-2">
          <Scissors className="w-6 h-6" />
          Tally's
        </a>
        <p className="text-muted-foreground text-sm mt-1 mb-8">Barbershop & Beauty Studio</p>

        <div className="bg-card border border-border rounded-xl p-8 shadow-lg space-y-4">
          {status === "verifying" && (
            <>
              <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
              <h2 className="text-lg font-bold">Verifying your email…</h2>
              <p className="text-sm text-muted-foreground">This will only take a moment.</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
              <h2 className="text-lg font-bold">Email verified!</h2>
              <p className="text-sm text-muted-foreground">
                You can now sign in and start booking appointments at Tally's.
              </p>
              <Button className="w-full mt-2" onClick={() => setLocation("/login?verified=success")}>
                Continue to Sign In
              </Button>
            </>
          )}
          {status === "expired" && (
            <>
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="text-lg font-bold">Link expired</h2>
              <p className="text-sm text-muted-foreground">
                This verification link has expired. Sign in and request a new one from your dashboard.
              </p>
              <Button className="w-full mt-2" onClick={() => setLocation("/login?verified=expired")}>
                Go to Sign In
              </Button>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="text-lg font-bold">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                We couldn't verify this link. It may be invalid — please request a new one.
              </p>
              <Button className="w-full mt-2" variant="outline" onClick={() => setLocation("/login")}>
                Go to Sign In
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
