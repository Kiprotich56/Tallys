import { useState } from "react";
import { useLocation } from "wouter";
import { Scissors, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const user = await login(email, password);
        toast({ title: `Welcome back, ${user.name}!` });
        setLocation(user.role === "admin" ? "/admin" : "/portal");
      } else {
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
        toast({ title: `Welcome to Tally's, ${user.name}!` });
        setLocation("/portal");
      }
    } catch (err: any) {
      const msg = err?.data?.error ?? err?.message ?? "Something went wrong";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 text-primary font-serif font-bold text-2xl mb-2">
            <Scissors className="w-6 h-6" />
            Tally's
          </a>
          <p className="text-muted-foreground text-sm mt-1">Barbershop & Beauty Studio</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden border border-border mb-8">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                mode === "login"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                mode === "register"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
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
                  <Input
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Phone Number</label>
                  <Input
                    placeholder="0712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">Email Address</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
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
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>
          )
        </div>
{mode === "login" && (
            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-xs text-muted-foreground mb-3">Admin access</p>
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@tallys.co.ke");
                  setPassword("Tallys@Admin2024");
                }}
                className="text-xs text-primary hover:underline"
              >
                Fill admin credentials
              </button>
            </div>
        <p className="text-center text-sm text-muted-foreground mt-6">
          <a href="/" className="hover:text-primary">← Back to website</a>
        </p>
      </div>
    </div>
  );
}
