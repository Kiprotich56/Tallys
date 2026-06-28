import { useState, useEffect, useCallback } from "react";
import { Database, Trash2, RefreshCw, ChevronDown, ChevronUp, Search, MessageCircle, Send, X, Eye } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TABLES = ["customers", "services", "staff", "appointments", "reviews", "users"] as const;
type TableName = typeof TABLES[number];

const TABLE_LABELS: Record<TableName, string> = {
  customers: "Customers",
  services: "Services",
  staff: "Staff",
  appointments: "Appointments",
  reviews: "Reviews",
  users: "Users",
};

interface TableOverview {
  table: string;
  count: number;
}

interface WhatsAppStatus {
  configured: boolean;
  mode: string;
  phoneId: string | null;
}

function Badge({ count }: { count: number }) {
  return (
    <span className="ml-auto text-xs font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
      {count}
    </span>
  );
}

function TableView({ tableName, onClose }: { tableName: TableName; onClose: () => void }) {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<Record<string, any> | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${BASE}/api/admin/db/${tableName}`);
    const data = await res.json();
    setRows(data);
    setLoading(false);
  }, [tableName]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    if (!confirm(`Delete record #${id}?`)) return;
    setDeleting(id);
    await fetch(`${BASE}/api/admin/db/${tableName}/${id}`, { method: "DELETE" });
    await load();
    setDeleting(null);
  };

  const handleEditOpen = (row: Record<string, any>) => {
    setEditRow(row);
    setEditValues({ ...row });
  };

  const handleEditSave = async () => {
    if (!editRow) return;
    setSaving(true);
    const { id, createdAt, ...patchable } = editValues;
    await fetch(`${BASE}/api/admin/db/${tableName}/${editRow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchable),
    });
    setEditRow(null);
    await load();
    setSaving(false);
  };

  const filtered = rows.filter(row =>
    Object.values(row).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
  );

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const priorityCols = ["id", "name", "email", "phone", "status", "date", "role", "category", "priceKes", "rating", "isActive"];
  const displayCols = columns.length > 0
    ? [...columns.filter(c => priorityCols.includes(c)), ...columns.filter(c => !priorityCols.includes(c) && c !== "createdAt")].slice(0, 8)
    : [];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold font-serif capitalize">{TABLE_LABELS[tableName]}</h2>
            <span className="text-sm text-muted-foreground">{rows.length} records</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter records..."
                className="pl-8 pr-3 py-1.5 text-sm bg-card border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary w-52"
              />
            </div>
            <button onClick={load} className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">No records found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b border-border">
                <tr>
                  {displayCols.map(col => (
                    <th key={col} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((row, i) => (
                  <tr key={row.id ?? i} className="hover:bg-accent/5 transition-colors">
                    {displayCols.map(col => (
                      <td key={col} className="px-4 py-3 max-w-[200px]">
                        <div className="truncate">
                          {col === "isActive" ? (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${row[col] ? "bg-green-900/30 text-green-500" : "bg-red-900/30 text-red-500"}`}>
                              {row[col] ? "Active" : "Inactive"}
                            </span>
                          ) : col === "status" ? (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize
                              ${row[col] === "pending" ? "bg-amber-900/30 text-amber-500" :
                                row[col] === "confirmed" || row[col] === "approved" ? "bg-blue-900/30 text-blue-400" :
                                row[col] === "completed" ? "bg-green-900/30 text-green-500" :
                                "bg-red-900/30 text-red-500"}`}>
                              {row[col]}
                            </span>
                          ) : col === "passwordHash" ? (
                            <span className="text-muted-foreground">••••••••</span>
                          ) : Array.isArray(row[col]) ? (
                            row[col].join(", ") || "—"
                          ) : row[col] == null ? (
                            <span className="text-muted-foreground/50">null</span>
                          ) : (
                            String(row[col])
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleEditOpen(row)}
                          className="p-1 text-muted-foreground hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          disabled={deleting === row.id}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editRow && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-bold">Edit Record #{editRow.id}</h3>
              <button onClick={() => setEditRow(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {Object.entries(editValues).filter(([k]) => !["id", "createdAt", "passwordHash"].includes(k)).map(([key, val]) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{key}</label>
                  {typeof val === "boolean" ? (
                    <select
                      value={String(val)}
                      onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value === "true" }))}
                      className="mt-1 w-full px-3 py-2 text-sm bg-card border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : Array.isArray(val) ? (
                    <input
                      value={val.join(", ")}
                      onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                      className="mt-1 w-full px-3 py-2 text-sm bg-card border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <input
                      value={val ?? ""}
                      onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 text-sm bg-card border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
              <button onClick={() => setEditRow(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WhatsAppPanel() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; simulated?: boolean; messageId?: string } | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/whatsapp/status`).then(r => r.json()).then(setStatus);
  }, []);

  const handleSend = async () => {
    if (!to || !message) return;
    setSending(true);
    setResult(null);
    const res = await fetch(`${BASE}/api/whatsapp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, message }),
    });
    const data = await res.json();
    setResult(data);
    setSending(false);
    if (data.ok) { setTo(""); setMessage(""); }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-green-500" />
        </div>
        <div>
          <h3 className="font-bold">WhatsApp Messaging</h3>
          <p className="text-xs text-muted-foreground">Send messages directly to customers</p>
        </div>
        <div className="ml-auto">
          {status && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.configured ? "bg-green-900/30 text-green-400" : "bg-amber-900/30 text-amber-400"}`}>
              {status.mode === "live" ? "🟢 Live" : "🟡 Simulation"}
            </span>
          )}
        </div>
      </div>

      {status && !status.configured && (
        <div className="mb-4 p-3 bg-amber-900/20 border border-amber-700/30 rounded-md text-xs text-amber-400">
          <strong>Simulation Mode:</strong> Messages won't actually be sent until you add <code>WHATSAPP_TOKEN</code> and <code>WHATSAPP_PHONE_ID</code> secrets. Messages are logged server-side.
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1">Recipient Phone (e.g. 0712345678)</label>
          <input
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="0712 345 678"
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Hi John, your appointment is confirmed for tomorrow at 10:00 AM..."
            rows={4}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSend}
            disabled={sending || !to || !message}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sending ? "Sending..." : "Send WhatsApp"}
          </button>
          {result && (
            <span className={`text-xs ${result.ok ? "text-green-400" : "text-red-400"}`}>
              {result.ok ? `✓ ${result.simulated ? "Simulated" : "Sent"} (ID: ${result.messageId})` : "Failed to send"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <h4 className="text-sm font-medium mb-3">Quick Templates</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { label: "Confirmation", text: "✅ Hi [Name], your appointment at Tally's Barbershop is confirmed! See you on [Date] at [Time]. 💈" },
            { label: "Reminder", text: "⏰ Hi [Name], friendly reminder: your appointment is tomorrow at [Time]. We look forward to seeing you at Tally's! 💈" },
            { label: "Follow-up", text: "⭐ Hi [Name], thank you for visiting Tally's Barbershop! We'd love your feedback. Reply to this message or book your next visit at tallys.co.ke 💈" },
          ].map(t => (
            <button
              key={t.label}
              onClick={() => setMessage(t.text)}
              className="text-left px-3 py-2 text-xs bg-background border border-border rounded-md hover:border-primary/50 hover:text-primary transition-colors"
            >
              <div className="font-medium mb-1">{t.label}</div>
              <div className="text-muted-foreground truncate">{t.text.slice(0, 60)}...</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminDatabase() {
  const [overview, setOverview] = useState<TableOverview[]>([]);
  const [activeTable, setActiveTable] = useState<TableName | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const loadOverview = async () => {
    setLoadingOverview(true);
    const res = await fetch(`${BASE}/api/admin/db/overview`);
    const data = await res.json();
    setOverview(data);
    setLoadingOverview(false);
  };

  useEffect(() => { loadOverview(); }, []);

  const getCount = (table: string) => overview.find(o => o.table === table)?.count ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-serif mb-1">Database Management</h1>
        <p className="text-muted-foreground">View and manage all database tables. Changes are applied immediately.</p>
      </div>

      {/* Tables Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Tables</h2>
          <button onClick={loadOverview} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingOverview ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {TABLES.map(table => (
            <button
              key={table}
              onClick={() => setActiveTable(table)}
              className="group bg-card border border-border hover:border-primary/50 rounded-lg p-4 text-left transition-all hover:shadow-md"
            >
              <Database className="w-5 h-5 text-primary mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-medium capitalize">{TABLE_LABELS[table]}</div>
              <div className="text-2xl font-bold text-primary mt-1">
                {loadingOverview ? "—" : getCount(table)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">records</div>
            </button>
          ))}
        </div>
      </div>

      {/* WhatsApp Panel */}
      <WhatsAppPanel />

      {/* Table Modal */}
      {activeTable && (
        <TableView tableName={activeTable} onClose={() => { setActiveTable(null); loadOverview(); }} />
      )}
    </div>
  );
}
