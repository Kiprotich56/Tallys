import { useState, useEffect } from "react";
import {
  TrendingUp, Download, DollarSign, Users, Check, Clock, ChevronDown,
  BarChart2, PieChart, RefreshCw
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart as RechartsPie, Pie, Legend
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const API = (path: string) => `${API_BASE}/api${path}`;
const GOLD = "#D4AF37";
const COLORS = ["#D4AF37", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

interface CommissionSummary {
  today: { revenue: number; commission: number; salon: number; count: number };
  week: { revenue: number; commission: number; salon: number; count: number };
  month: { revenue: number; commission: number; salon: number; count: number };
  total: { revenue: number; commission: number; salon: number; count: number; pending: number; paid: number };
  byBarber: Array<{ staffId: number; name: string; total: number; commission: number; salon: number }>;
  byService: Array<{ serviceId: number; name: string; total: number; count: number }>;
  monthlyTrend: Array<{ month: string; revenue: number; commission: number; salon: number }>;
}

interface Commission {
  id: number;
  appointmentId: number;
  staffId: number;
  staffName: string | null;
  customerId: number;
  customerName: string | null;
  serviceId: number;
  serviceName: string | null;
  servicePriceKes: number;
  commissionPct: number;
  commissionAmountKes: number;
  salonAmountKes: number;
  paymentStatus: string;
  paymentDate: string | null;
  paymentNotes: string | null;
  completedAt: string;
}

function StatCard({ label, value, sub, icon: Icon, accent = false }: {
  label: string; value: string; sub?: string; icon: any; accent?: boolean;
}) {
  return (
    <div className={`bg-card border rounded-lg p-5 ${accent ? "border-primary/30" : "border-border"}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`w-4 h-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div className={`text-2xl font-bold ${accent ? "text-primary" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminCommissions() {
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "records" | "settings">("overview");
  const [filterStaff, setFilterStaff] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const { toast } = useToast();

  async function fetchData() {
    setLoading(true);
    try {
      const [sumRes, comRes] = await Promise.all([
        fetch(API("/commissions/summary"), { credentials: "include" }),
        fetch(API("/commissions"), { credentials: "include" }),
      ]);
      if (sumRes.ok) setSummary(await sumRes.json());
      if (comRes.ok) setCommissions(await comRes.json());
    } catch {
      toast({ title: "Failed to load commission data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function markPayment(id: number, paymentStatus: "paid" | "pending", paymentNotes?: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(API(`/commissions/${id}/payment`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus, paymentNotes }),
      });
      if (res.ok) {
        toast({ title: `Commission marked as ${paymentStatus}` });
        fetchData();
      } else {
        toast({ title: "Failed to update payment status", variant: "destructive" });
      }
    } finally {
      setUpdatingId(null);
    }
  }

  const exportCsv = () => {
    window.open(API("/commissions/export/csv"), "_blank");
  };

  const filtered = commissions.filter(c => {
    if (filterStaff && !c.staffName?.toLowerCase().includes(filterStaff.toLowerCase())) return false;
    if (filterStatus && c.paymentStatus !== filterStatus) return false;
    if (filterStart && c.completedAt < filterStart) return false;
    if (filterEnd && c.completedAt > filterEnd) return false;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading commission data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">Commission Management</h1>
          <p className="text-muted-foreground text-sm">Track earnings, barber commissions, and payments.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["overview", "records", "settings"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "overview" && summary && (
        <div className="space-y-8">
          {/* Period stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Today's Revenue" value={`KSh ${summary.today.revenue.toLocaleString()}`} sub={`${summary.today.count} services`} icon={DollarSign} accent />
            <StatCard label="Weekly Revenue" value={`KSh ${summary.week.revenue.toLocaleString()}`} sub={`${summary.week.count} services`} icon={TrendingUp} />
            <StatCard label="Monthly Revenue" value={`KSh ${summary.month.revenue.toLocaleString()}`} sub={`${summary.month.count} services`} icon={BarChart2} />
            <StatCard label="All-Time Revenue" value={`KSh ${summary.total.revenue.toLocaleString()}`} sub={`${summary.total.count} total`} icon={PieChart} />
          </div>

          {/* Commission breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="text-sm text-muted-foreground mb-1">Total Barber Commission</div>
              <div className="text-2xl font-bold text-primary">KSh {summary.total.commission.toLocaleString()}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="text-sm text-muted-foreground mb-1">Pending Payment</div>
              <div className="text-2xl font-bold text-amber-500">KSh {summary.total.pending.toLocaleString()}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="text-sm text-muted-foreground mb-1">Paid Out</div>
              <div className="text-2xl font-bold text-green-500">KSh {summary.total.paid.toLocaleString()}</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly trend */}
            {summary.monthlyTrend.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-semibold mb-4">Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={summary.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }} />
                    <Line type="monotone" dataKey="revenue" stroke={GOLD} strokeWidth={2} name="Revenue" dot={false} />
                    <Line type="monotone" dataKey="commission" stroke="#22c55e" strokeWidth={2} name="Commission" dot={false} />
                    <Line type="monotone" dataKey="salon" stroke="#3b82f6" strokeWidth={2} name="Salon" dot={false} />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Revenue by barber */}
            {summary.byBarber.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-semibold mb-4">Revenue by Barber</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={summary.byBarber.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#888" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#888" }} width={80} />
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }} />
                    <Bar dataKey="commission" fill={GOLD} radius={[0, 3, 3, 0]} name="Commission (KES)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Revenue by service */}
            {summary.byService.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-semibold mb-4">Most Booked Services</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={summary.byService.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }} />
                    <Bar dataKey="count" name="Bookings" radius={[3, 3, 0, 0]}>
                      {summary.byService.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Salon vs Commission split */}
            {summary.total.revenue > 0 && (
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-semibold mb-4">Revenue Split</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RechartsPie>
                    <Pie
                      data={[
                        { name: "Salon", value: summary.total.salon },
                        { name: "Barbers", value: summary.total.commission },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill={GOLD} />
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }}
                      formatter={(v: any) => `KSh ${Number(v).toLocaleString()}`} />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top performing barbers table */}
          {summary.byBarber.length > 0 && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">Barber Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-background text-muted-foreground text-xs uppercase border-b border-border">
                    <tr>
                      <th className="p-3 text-left">Barber</th>
                      <th className="p-3 text-right">Revenue</th>
                      <th className="p-3 text-right">Commission</th>
                      <th className="p-3 text-right">Salon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summary.byBarber.sort((a, b) => b.commission - a.commission).map((b, i) => (
                      <tr key={b.staffId} className="hover:bg-accent/5">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-5 text-xs">#{i + 1}</span>
                            <span className="font-medium">{b.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-medium">KSh {b.total.toLocaleString()}</td>
                        <td className="p-3 text-right text-primary font-bold">KSh {b.commission.toLocaleString()}</td>
                        <td className="p-3 text-right text-blue-400">KSh {b.salon.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "records" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Filter by barber..."
              value={filterStaff}
              onChange={e => setFilterStaff(e.target.value)}
              className="w-48"
            />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
            <Input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="w-40" />
            <Input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="w-40" />
            <Button variant="ghost" size="sm" onClick={() => { setFilterStaff(""); setFilterStatus(""); setFilterStart(""); setFilterEnd(""); }}>
              Clear
            </Button>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-background text-muted-foreground text-xs uppercase border-b border-border">
                  <tr>
                    <th className="p-3 text-left">Barber</th>
                    <th className="p-3 text-left">Customer</th>
                    <th className="p-3 text-left">Service</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-right">Comm %</th>
                    <th className="p-3 text-right">Commission</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No commissions found.</td></tr>
                  ) : filtered.map(c => (
                    <tr key={c.id} className="hover:bg-accent/5">
                      <td className="p-3 font-medium">{c.staffName ?? "—"}</td>
                      <td className="p-3 text-muted-foreground">{c.customerName ?? "—"}</td>
                      <td className="p-3">{c.serviceName ?? "—"}</td>
                      <td className="p-3 text-right">KSh {c.servicePriceKes.toLocaleString()}</td>
                      <td className="p-3 text-right">{c.commissionPct}%</td>
                      <td className="p-3 text-right text-primary font-bold">KSh {c.commissionAmountKes.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          c.paymentStatus === "paid" ? "bg-green-900/30 text-green-500" : "bg-amber-900/30 text-amber-500"
                        }`}>
                          {c.paymentStatus === "paid" ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {c.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {new Date(c.completedAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-center">
                        {c.paymentStatus === "pending" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={updatingId === c.id}
                            onClick={() => markPayment(c.id, "paid")}
                          >
                            {updatingId === c.id ? "..." : "Mark Paid"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground"
                            disabled={updatingId === c.id}
                            onClick={() => markPayment(c.id, "pending")}
                          >
                            Revert
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && (
              <div className="p-3 border-t border-border text-xs text-muted-foreground">
                {filtered.length} record{filtered.length !== 1 ? "s" : ""} ·
                Total commission: KSh {filtered.reduce((s, c) => s + c.commissionAmountKes, 0).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <ServiceCommissionSettings />
      )}
    </div>
  );
}

function ServiceCommissionSettings() {
  const [services, setServices] = useState<any[]>([]);
  const [rates, setRates] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const BASE = import.meta.env.VITE_API_URL ?? "";
    Promise.all([
      fetch(`${BASE}/api/services`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}/api/commissions/service-rates`, { credentials: "include" }).then(r => r.json()),
    ]).then(([svcs, ratesArr]) => {
      setServices(svcs);
      const map: Record<number, number> = {};
      for (const r of ratesArr) map[r.serviceId] = r.commissionPct;
      setRates(map);
    }).catch(() => {});
  }, []);

  async function saveRate(serviceId: number, pct: number) {
    setSaving(serviceId);
    try {
      const BASE = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${BASE}/api/commissions/service-rates`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, commissionPct: pct }),
      });
      if (res.ok) toast({ title: "Commission rate saved" });
      else toast({ title: "Failed to save rate", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-semibold mb-1">Service-Specific Commission Rates</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Override the default barber commission % for specific services. Priority: service-specific → barber-specific → default (30%).
        </p>
        <div className="space-y-3">
          {services.map(svc => (
            <div key={svc.id} className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0">
              <div className="flex-1">
                <div className="font-medium text-sm">{svc.name}</div>
                <div className="text-xs text-muted-foreground">KSh {svc.priceKes?.toLocaleString()} · {svc.category}</div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="w-20 h-8 text-sm"
                  placeholder="30"
                  value={rates[svc.id] ?? ""}
                  onChange={e => setRates(prev => ({ ...prev, [svc.id]: Number(e.target.value) }))}
                />
                <span className="text-sm text-muted-foreground">%</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={saving === svc.id || rates[svc.id] === undefined}
                  onClick={() => saveRate(svc.id, rates[svc.id])}
                >
                  {saving === svc.id ? "..." : "Save"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
