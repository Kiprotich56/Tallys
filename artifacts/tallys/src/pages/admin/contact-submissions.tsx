import { useState, useEffect } from "react";
import { Mail, Check, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface Submission {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: "unread" | "read" | "replied";
  createdAt: string;
}

export default function AdminContactSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  async function fetchSubmissions() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/contact`, { credentials: "include" });
      if (res.ok) setSubmissions(await res.json());
    } catch {
      toast({ title: "Failed to load submissions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSubmissions(); }, []);

  async function updateStatus(id: number, status: string) {
    try {
      const res = await fetch(`${API_BASE}/api/contact/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: status as any } : s));
        if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: status as any } : null);
      }
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  }

  const filtered = submissions.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.message.toLowerCase().includes(search.toLowerCase())
  );

  const unread = submissions.filter(s => s.status === "unread").length;

  const statusBadge = (status: string) => {
    switch (status) {
      case "unread": return "bg-amber-900/30 text-amber-400";
      case "read": return "bg-blue-900/30 text-blue-400";
      case "replied": return "bg-green-900/30 text-green-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">Contact Submissions</h1>
          <p className="text-muted-foreground text-sm">
            Manage enquiries from the contact form.
            {unread > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">
                {unread} unread
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSubmissions} className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Search by name, email or message..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center text-muted-foreground py-12">Loading submissions...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 bg-card border border-border rounded-lg">
              {search ? "No submissions match your search." : "No contact submissions yet."}
            </div>
          ) : (
            filtered.map(sub => (
              <button
                key={sub.id}
                onClick={() => {
                  setSelected(sub);
                  if (sub.status === "unread") updateStatus(sub.id, "read");
                }}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selected?.id === sub.id
                    ? "border-primary bg-primary/5"
                    : sub.status === "unread"
                    ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-bold text-sm truncate">{sub.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase flex-shrink-0 ${statusBadge(sub.status)}`}>
                    {sub.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-1">{sub.email}</p>
                {sub.subject && <p className="text-xs font-medium text-primary/80 truncate mb-1">{sub.subject}</p>}
                <p className="text-xs text-muted-foreground line-clamp-2">{sub.message}</p>
                <p className="text-xs text-muted-foreground/60 mt-2">
                  {format(parseISO(sub.createdAt), "MMM d, yyyy · h:mm a")}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div>
          {selected ? (
            <div className="bg-card border border-border rounded-lg p-6 space-y-5 sticky top-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold text-lg">{selected.name}</h2>
                  <p className="text-sm text-muted-foreground">{selected.email}</p>
                  {selected.phone && <p className="text-sm text-muted-foreground">{selected.phone}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${statusBadge(selected.status)}`}>
                  {selected.status}
                </span>
              </div>

              {selected.subject && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Subject</p>
                  <p className="font-medium">{selected.subject}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Message</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap bg-background/50 rounded-md p-4 border border-border/50">
                  {selected.message}
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                Received {format(parseISO(selected.createdAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
              </p>

              <div className="flex gap-2 flex-wrap">
                {selected.status !== "read" && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => updateStatus(selected.id, "read")}>
                    <Eye className="w-3.5 h-3.5" /> Mark Read
                  </Button>
                )}
                {selected.status !== "replied" && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-green-500 border-green-500/30 hover:bg-green-500/10"
                    onClick={() => updateStatus(selected.id, "replied")}>
                    <Check className="w-3.5 h-3.5" /> Mark Replied
                  </Button>
                )}
                <Button size="sm" variant="outline" asChild>
                  <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject ?? "Your enquiry at Tally's")}`}
                    className="gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Reply via Email
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[200px] bg-card border border-dashed border-border rounded-lg text-muted-foreground text-sm">
              Select a submission to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
