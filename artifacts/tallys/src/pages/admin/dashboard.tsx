import { useGetDashboardSummary, useGetRevenueTrend, useGetTodayAppointments, useGetStaffPerformance, useGetServicePopularity } from "@workspace/api-client-react";
import { Users, Calendar, TrendingUp, DollarSign, Star, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { useMemo } from "react";

const GOLD = "#D4AF37";

const STAFF_COLORS = [
  "#D4AF37", "#60a5fa", "#34d399", "#f472b6",
  "#fb923c", "#a78bfa", "#38bdf8", "#4ade80",
];

type Appointment = {
  id: number;
  timeSlot: string;
  status: string;
  customerName: string | null;
  serviceName: string | null;
  staffName: string | null;
  totalKes: number;
};

function parseTime(slot: string): number {
  const clean = slot.trim().toUpperCase();
  const ampm = clean.includes("AM") || clean.includes("PM");
  if (ampm) {
    const [timePart, period] = clean.split(/\s+/);
    const [h, m] = timePart.split(":").map(Number);
    const hours = period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h;
    return hours * 60 + (m || 0);
  }
  const [h, m] = clean.split(":").map(Number);
  return h * 60 + (m || 0);
}

function formatTimeLabel(slot: string): string {
  try {
    const m = parseTime(slot);
    const h = Math.floor(m / 60);
    const min = m % 60;
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 || 12;
    return `${displayH}:${String(min).padStart(2, "0")} ${period}`;
  } catch {
    return slot;
  }
}

function getNowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function TodaySchedule({ appointments, loading }: { appointments: Appointment[] | undefined; loading: boolean }) {
  const nowMin = getNowMinutes();

  const sorted = useMemo(() => {
    if (!appointments) return [];
    return [...appointments]
      .filter(a => a.status !== "cancelled")
      .sort((a, b) => parseTime(a.timeSlot) - parseTime(b.timeSlot));
  }, [appointments]);

  const staffWorkload = useMemo(() => {
    const map = new Map<string, number>();
    sorted.forEach(a => {
      const name = a.staffName ?? "Unknown";
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [sorted]);

  const nextUp = useMemo(() => {
    return sorted.find(a =>
      a.status !== "completed" &&
      a.status !== "cancelled" &&
      parseTime(a.timeSlot) >= nowMin,
    ) ?? null;
  }, [sorted, nowMin]);

  const totalCompleted = sorted.filter(a => a.status === "completed").length;
  const totalRemaining = sorted.filter(a => a.status !== "completed").length;

  const staffColorMap = useMemo(() => {
    const names = [...new Set(sorted.map(a => a.staffName ?? "Unknown"))];
    const m = new Map<string, string>();
    names.forEach((name, i) => m.set(name, STAFF_COLORS[i % STAFF_COLORS.length]));
    return m;
  }, [sorted]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Loading schedule...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-background rounded-lg p-3 text-center border border-border/50">
          <div className="text-xl font-bold text-primary">{sorted.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Total</div>
        </div>
        <div className="bg-background rounded-lg p-3 text-center border border-border/50">
          <div className="text-xl font-bold text-green-500">{totalCompleted}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Done</div>
        </div>
        <div className="bg-background rounded-lg p-3 text-center border border-border/50">
          <div className="text-xl font-bold text-amber-400">{totalRemaining}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Remaining</div>
        </div>
      </div>

      {/* Next up */}
      {nextUp ? (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Next Up</span>
          </div>
          <div className="font-bold text-sm">{nextUp.customerName}</div>
          <div className="text-xs text-muted-foreground flex justify-between mt-0.5">
            <span>{nextUp.serviceName} · {nextUp.staffName}</span>
            <span className="text-primary font-medium">{formatTimeLabel(nextUp.timeSlot)}</span>
          </div>
        </div>
      ) : sorted.length > 0 ? (
        <div className="flex items-center gap-2 text-green-500 text-xs bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          All appointments for today are complete.
        </div>
      ) : null}

      {/* Staff workload */}
      {staffWorkload.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Staff Workload</div>
          <div className="flex flex-wrap gap-2">
            {staffWorkload.map(([name, count]) => (
              <div
                key={name}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border"
                style={{
                  borderColor: staffColorMap.get(name) + "55",
                  backgroundColor: staffColorMap.get(name) + "15",
                  color: staffColorMap.get(name),
                }}
              >
                <span className="font-semibold">{name.split(" ")[0]}</span>
                <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[10px]"
                  style={{ background: staffColorMap.get(name) + "33" }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chronological list */}
      {sorted.length === 0 ? (
        <div className="text-center text-muted-foreground py-6 text-sm">
          No appointments scheduled for today.
        </div>
      ) : (
        <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
          {sorted.map((appt, idx) => {
            const prev = sorted[idx - 1];
            const gap = prev ? parseTime(appt.timeSlot) - parseTime(prev.timeSlot) : 0;
            const showGap = gap > 60;
            const isPast = parseTime(appt.timeSlot) < nowMin;
            const isNext = nextUp?.id === appt.id;

            return (
              <div key={appt.id}>
                {showGap && (
                  <div className="flex items-center gap-2 py-1.5 px-2">
                    <div className="flex-1 border-t border-dashed border-border/50" />
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="w-2.5 h-2.5" />
                      {Math.round(gap / 60)}h gap
                    </span>
                    <div className="flex-1 border-t border-dashed border-border/50" />
                  </div>
                )}
                <div className={`rounded-lg px-3 py-2.5 flex items-center gap-3 transition-colors
                  ${isNext ? "bg-primary/10 border border-primary/20" : "hover:bg-accent/5"}
                  ${isPast && appt.status !== "completed" ? "opacity-60" : ""}`}
                >
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ background: staffColorMap.get(appt.staffName ?? "") ?? "#555" }}
                  />
                  <div className="min-w-[54px]">
                    <div className={`text-xs font-bold ${isNext ? "text-primary" : "text-foreground"}`}>
                      {formatTimeLabel(appt.timeSlot)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{appt.customerName}</div>
                    <div className="text-xs text-muted-foreground truncate">{appt.serviceName}</div>
                  </div>
                  <div className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex-shrink-0
                    ${appt.status === "completed" ? "bg-green-900/30 text-green-500" :
                      appt.status === "confirmed" ? "bg-blue-900/30 text-blue-400" :
                      "bg-amber-900/30 text-amber-400"}`}
                  >
                    {appt.status === "confirmed" ? "conf." : appt.status}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: revenueTrend, isLoading: loadingTrend } = useGetRevenueTrend();
  const { data: todayAppointments, isLoading: loadingToday } = useGetTodayAppointments();
  const { data: staffPerformance, isLoading: loadingStaff } = useGetStaffPerformance();
  const { data: servicePopularity, isLoading: loadingServices } = useGetServicePopularity();

  if (loadingSummary) return <div className="p-8 text-muted-foreground">Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-serif mb-1">Overview</h1>
        <p className="text-muted-foreground">Welcome to Tally's Admin Dashboard.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Daily Revenue</h3>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">KSh {summary?.dailyRevenue?.toLocaleString() || 0}</div>
          <div className="text-xs text-muted-foreground mt-1">Today</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Monthly Revenue</h3>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">KSh {summary?.monthlyRevenue?.toLocaleString() || 0}</div>
          <div className="text-xs text-muted-foreground mt-1">This month</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Today's Appts</h3>
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">{summary?.todayAppointments || 0}</div>
          <div className="text-xs text-muted-foreground mt-1">{summary?.pendingAppointments || 0} pending</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Total Customers</h3>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">{summary?.totalCustomers || 0}</div>
          <div className="text-xs text-muted-foreground mt-1">{summary?.repeatCustomerRate || 0}% repeat rate</div>
        </div>
      </div>

      {/* Revenue chart + Today's schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-card border border-border p-6 rounded-lg lg:col-span-2">
          <h3 className="text-lg font-bold mb-6">Revenue Trend (30 Days)</h3>
          <div className="h-[300px]">
            {!loadingTrend && revenueTrend && revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="date" stroke="#888" tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                  <YAxis stroke="#888" tickFormatter={(val) => `KSh ${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333' }}
                    itemStyle={{ color: GOLD }}
                    formatter={(val: number) => [`KSh ${val.toLocaleString()}`, 'Revenue']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  />
                  <Line type="monotone" dataKey="revenue" stroke={GOLD} strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No revenue data yet</div>
            )}
          </div>
        </div>

        {/* Enhanced Today's Schedule */}
        <div className="bg-card border border-border p-6 rounded-lg flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold">Today's Schedule</h3>
            <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full font-bold">
              {new Date().toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>
          <TodaySchedule appointments={todayAppointments as Appointment[] | undefined} loading={loadingToday} />
        </div>
      </div>

      {/* Staff performance + Top services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-bold">Staff Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background text-muted-foreground text-xs uppercase tracking-wider text-left">
                <tr>
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Services</th>
                  <th className="p-4 font-medium">Revenue</th>
                  <th className="p-4 font-medium">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!loadingStaff && staffPerformance?.map(staff => (
                  <tr key={staff.staffId} className="hover:bg-accent/5">
                    <td className="p-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                          {staff.name.charAt(0)}
                        </div>
                        <span className="text-sm">{staff.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">{staff.completedServices}</td>
                    <td className="p-4 text-sm text-primary font-medium">KSh {staff.revenueKes.toLocaleString()}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                        {staff.avgRating ? staff.avgRating.toFixed(1) : 'N/A'}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loadingStaff && (!staffPerformance || staffPerformance.length === 0) && (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-sm">No performance data yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-lg">
          <h3 className="text-lg font-bold mb-6">Top Services</h3>
          <div className="h-[220px]">
            {!loadingServices && servicePopularity && servicePopularity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={servicePopularity.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                  <XAxis type="number" stroke="#888" fontSize={11} />
                  <YAxis type="category" dataKey="serviceName" stroke="#888" fontSize={11} width={110} tick={{ fill: '#aaa' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333' }}
                    itemStyle={{ color: GOLD }}
                    formatter={(val: number) => [val, 'Bookings']}
                  />
                  <Bar dataKey="bookingCount" radius={[0, 4, 4, 0]}>
                    {servicePopularity.slice(0, 6).map((_, i) => (
                      <Cell key={i} fill={i === 0 ? GOLD : `rgba(212,175,55,${0.8 - i * 0.12})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No booking data yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
