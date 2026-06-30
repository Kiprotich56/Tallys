import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Star, Calendar, Clock, Crown, History, LogOut, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import {
  useGetCustomer,
  useGetCustomerAppointments,
  useGetLoyalty,
  useCancelAppointment,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const TIER_VISITS: Record<string, [number, number]> = {
  Bronze: [0, 4],
  Silver: [5, 14],
  Gold: [15, 29],
  Platinum: [30, 100],
};

function calcProgress(tier: string, visits: number): number {
  const range = TIER_VISITS[tier];
  if (!range) return 100;
  const [min, max] = range;
  if (visits >= max) return 100;
  return Math.round(((visits - min) / (max - min)) * 100);
}

type ResendState = "idle" | "sending" | "sent" | "error";

export default function PortalDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [resendState, setResendState] = useState<ResendState>("idle");

  const handleResendVerification = async () => {
    setResendState("sending");
    try {
      const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
      const res = await fetch(`${base}/api/auth/resend-verification`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      setResendState("sent");
    } catch {
      setResendState("error");
    }
  };

  const customerId = user?.customerId ?? 0;

  const { data: customer } = useGetCustomer(customerId, { query: { enabled: customerId > 0 } });
  const { data: appointments, refetch: refetchAppointments } = useGetCustomerAppointments(customerId, { query: { enabled: customerId > 0 } });
  const { data: loyalty } = useGetLoyalty(customerId, { query: { enabled: customerId > 0 } });

  const cancelAppointment = useCancelAppointment();

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const handleCancelConfirm = () => {
    if (!cancelId) return;
    cancelAppointment.mutate({ id: cancelId }, {
      onSuccess: () => {
        refetchAppointments();
        setCancelId(null);
      },
    });
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "platinum": return "text-slate-200 border-slate-200";
      case "gold": return "text-primary border-primary";
      case "silver": return "text-slate-400 border-slate-400";
      default: return "text-amber-700 border-amber-700";
    }
  };

  const tier = loyalty?.tier ?? "Bronze";
  const visits = customer?.totalVisits ?? 0;
  const progress = calcProgress(tier, visits);

  const upcoming = appointments?.filter(a => a.status === "confirmed" || a.status === "pending") ?? [];
  const past = appointments?.filter(a => a.status === "completed") ?? [];

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      {/* Header */}
      <div className="mb-12 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-2">
            Welcome back, {customer?.name || user?.name || "Client"}
          </h1>
          <p className="text-muted-foreground">
            Manage your appointments and view your Tally's Society benefits.
          </p>
        </div>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-2" onClick={handleLogout}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>

      {/* Email verification banner */}
      {user && !user.emailVerified && (
        <div className="mb-8 flex items-start gap-3 border border-amber-500/40 bg-amber-500/10 rounded-lg px-5 py-4">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-200">
              Please verify your email address
            </p>
            <p className="text-xs text-amber-300/80 mt-0.5">
              We sent a link to <strong>{user.email}</strong>. Check your inbox (and spam folder).
            </p>
          </div>
          <div className="shrink-0">
            {resendState === "sent" ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-green-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Sent!
              </span>
            ) : resendState === "error" ? (
              <button
                onClick={() => setResendState("idle")}
                className="text-xs text-destructive underline"
              >
                Failed — try again
              </button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 border-amber-500/40 text-amber-200 hover:bg-amber-500/20 hover:text-amber-100"
                disabled={resendState === "sending"}
                onClick={handleResendVerification}
              >
                <Mail className="w-3.5 h-3.5 mr-1.5" />
                {resendState === "sending" ? "Sending…" : "Resend email"}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {/* Upcoming appointments */}
        <div className="bg-card border border-border p-6 rounded-lg md:col-span-2">
          <div className="flex items-center gap-2 mb-6 text-primary">
            <Calendar className="w-5 h-5" />
            <h2 className="text-xl font-bold">Upcoming Appointments</h2>
          </div>

          <div className="space-y-4">
            {upcoming.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-background/50 rounded-md border border-dashed border-border">
                No upcoming appointments.
                <div className="mt-4">
                  <Link href="/book" className="text-primary hover:underline">Book an appointment</Link>
                </div>
              </div>
            ) : upcoming.map(app => (
              <div key={app.id} className="border border-border p-4 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg">{app.serviceName}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {app.date} at {app.timeSlot}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">with {app.staffName}</p>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded uppercase tracking-wider font-bold">
                    {app.status}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setCancelId(app.id)} disabled={cancelAppointment.isPending}>
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loyalty card */}
        <div className="space-y-8">
          <div className="bg-card border border-border p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-6 text-primary">
              <Crown className="w-5 h-5" />
              <h2 className="text-xl font-bold">Society Status</h2>
            </div>

            <div className="text-center mb-6">
              <div className={`inline-block px-4 py-1 border rounded-full font-bold mb-4 uppercase tracking-wider ${getTierColor(tier)}`}>
                {tier} Tier
              </div>
              <p className="text-3xl font-serif font-bold">{loyalty?.points ?? 0}</p>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Points</p>
            </div>

            {loyalty?.nextTier && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress to {loyalty.nextTier}</span>
                  <span>{loyalty.visitsToNextTier} visit{loyalty.visitsToNextTier !== 1 ? "s" : ""} left</span>
                </div>
                <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Your Benefits</h4>
              <ul className="text-sm space-y-2">
                {loyalty?.benefits && loyalty.benefits.length > 0 ? (
                  loyalty.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground text-center py-2">Complete visits to unlock benefits</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Past appointments */}
      <div className="bg-card border border-border p-6 rounded-lg">
        <div className="flex items-center gap-2 mb-6 text-primary">
          <History className="w-5 h-5" />
          <h2 className="text-xl font-bold">Past Appointments</h2>
        </div>

        <div className="space-y-4">
          {past.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">No past appointments found.</div>
          ) : past.slice(0, 8).map(app => (
            <div key={app.id} className="border border-border/50 p-4 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold">{app.serviceName}</h3>
                <p className="text-sm text-muted-foreground">{app.date} with {app.staffName}</p>
              </div>
              <div className="font-medium text-primary">KSh {app.totalKes?.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel It
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
