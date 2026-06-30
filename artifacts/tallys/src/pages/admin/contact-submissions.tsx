import { useState, useEffect } from "react";
import { Mail, Check, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

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
      const res = await fetch("/api/contact", { credentials: "include" });
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
      const res = await fetch(`/api/contact/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: status as any } : s));
        if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: status as any } : null);
        toast({ title: `Marked as ${status}` });
      }
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  }

  const filtered = submissions.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.message.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (status: string) => {
    if (status === "unread") return "bg-blue-900/30 text-blue-400";
    if (status === "replied") return "bg-green-900/30 text-green-500";
    return "bg-muted text-muted-foreground";
  };

  const unreadCount = submissions.filter(s => s.status === "unread").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1 flex items-center gap-2">
            Contact Submissions
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">Messages sent through the contact form.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSubmissions} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      <div className="flex items-center max-w-md relative">
        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search submissions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* List */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No submissions found.</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelected(s); if (s.status === "unread") updateStatus(s.id, "read"); }}
                  className={`w-full text-left p-4 hover:bg-accent/5 transition-colors ${selected?.id === s.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={`font-medium text-sm ${s.status === "unread" ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.name}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${statusColor(s.status)}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">{s.email}</div>
                  {s.subject && <div className="text-xs font-medium truncate mb-1">{s.subject}</div>}
                  <div className="text-xs text-muted-foreground truncate">{s.message}</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-1">
                    {format(parseISO(s.createdAt), "MMM d, yyyy · h:mm a")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">{selected.name}</h2>
                  <p className="text-sm text-primary">{selected.email}</p>
                  {selected.phone && <p className="text-sm text-muted-foreground">{selected.phone}</p>}
                </div>
                <div className="flex gap-2">
                  {selected.status !== "replied" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(selected.id, "replied")} className="gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Mark Replied
                    </Button>
                  )}
                  {selected.status !== "read" && selected.status !== "replied" && (
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(selected.id, "read")} className="gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Mark Read
                    </Button>
                  )}
                </div>
              </div>

              {selected.subject && (
                <div className="bg-background rounded px-4 py-2">
                  <span className="text-xs text-muted-foreground uppercase font-bold">Subject: </span>
                  <span className="text-sm">{selected.subject}</span>
                </div>
              )}

              <div className="bg-background rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {selected.message}
              </div>

              <div className="text-xs text-muted-foreground">
                Received {format(parseISO(selected.createdAt), "MMMM d, yyyy 'at' h:mm a")}
              </div>

              <a
                href={`mailto:${selected.email}?subject=Re: ${selected.subject ?? "Your message to Tally's"}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-accent/10 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Reply via Email
              </a>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground border border-dashed border-border rounded-lg">
              Select a message to read it
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
