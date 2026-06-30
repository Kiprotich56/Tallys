import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Scissors, Eye, EyeOff, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Mode = "login" | "register" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  const params = new URLSearchParams(search);
  const redirect = params.get("redirect") ?? null;
  const verified = params.get("verified");

  useEffect(() => {
    if (verified === "success") {
      toast({ title: "Email verified!", description: "You can now log in and start booking." });
    } else if (verified === "expired") {
      toast({ title: "Verification link expired", description: "Please request a new one after logging in.", variant: "destructive" });
    }
  }, [verified]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const user = await login(email, password);
        toast({ title: `Welcome back, ${user.name}!` });
        if (redirect) {
          setLocation(redirect);
        } else {
          setLocation(user.role === "admin" ? "/admin" : "/portal");
        }
      } else if (mode === "register") {
        if (!name.trim()) {
          toast({ title: "Name is required", variant: "destructive" });
          setLoading(false);
          return;
        }
        if (!phone.trim()) {
          toast({ title: "Phone number is required", variant: "destructive" });
          setLoading(false);
          return;
        }
        const user = await register(email, password, name, phone);
        toast({ title: `Welcome to Tally's, ${user.name}!`, description: "Check your email to verify your account." });
        setLocation(redirect ?? "/portal");
      } else if (mode === "forgot") {
        const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
        const res = await fetch(`${base}/api/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email }),
        });
        if (res.ok) {
          setForgotSent(true);
        } else {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to send reset email");
        }
      }
    } catch (err: any) {
      const msg = err?.data?.error ?? err?.message ?? "Something went wrong";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 text-primary font-serif font-bold text-2xl mb-2">
            <Scissors className="w-6 h-6" />
            Tally's
          </a>
          <p className="text-muted-foreground text-sm mt-1">Barbershop & Beauty Studio</p>
          {redirect && (
            <p className="text-sm text-primary mt-2 bg-primary/10 rounded-md px-3 py-2">
              Please sign in to continue booking.
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          {mode !== "forgot" ? (
            <>
              {/* Tabs */}
              <div className="flex rounded-lg overflow-hidden border border-border mb-8">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Full Name</label>
                      <Input placeholder="Jane Doe" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Phone Number</label>
                      <Input placeholder="0712 345 678" value={phone} onChange={e => setPhone(e.target.value)} required />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1.5">Email Address</label>
                  <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-medium">Password</label>
                    {mode === "login" && (
                      <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={mode === "register" ? 8 : 1}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === "register" && (
                    <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters</p>
                  )}
                </div>

                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
                </Button>
              </form>
            </>
          ) : (
            /* Forgot password form */
            forgotSent ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
                <h2 className="text-lg font-bold">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  If an account with <strong>{email}</strong> exists, we've sent a password reset link.
                </p>
                <Button variant="outline" className="w-full mt-4" onClick={() => { setMode("login"); setForgotSent(false); }}>
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <button onClick={() => setMode("login")} className="text-muted-foreground hover:text-foreground text-sm">← Back</button>
                  <h2 className="font-bold">Reset Password</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-5">Enter your email address and we'll send you a link to reset your password.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Email Address</label>
                    <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </>
            )
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <a href="/" className="hover:text-primary">← Back to website</a>
        </p>
      </div>
    </div>
  );
}
