import { useGetDashboardSummary, useGetRevenueTrend, useGetTodayAppointments, useGetStaffPerformance, useGetServicePopularity } from "@workspace/api-client-react";
import { Users, Calendar, TrendingUp, DollarSign, Star } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export default function AdminDashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: revenueTrend, isLoading: loadingTrend } = useGetRevenueTrend();
  const { data: todayAppointments, isLoading: loadingToday } = useGetTodayAppointments();
  const { data: staffPerformance, isLoading: loadingStaff } = useGetStaffPerformance();
  const { data: servicePopularity, isLoading: loadingServices } = useGetServicePopularity();

  if (loadingSummary) return <div className="p-8 text-muted-foreground">Loading dashboard...</div>;

  const GOLD = "#D4AF37";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-serif mb-1">Overview</h1>
        <p className="text-muted-foreground">Welcome to Tally's Admin Dashboard.</p>
      </div>

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

        <div className="bg-card border border-border p-6 rounded-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Today's Schedule</h3>
            <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full font-bold">
              {todayAppointments?.length || 0} total
            </span>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {!loadingToday && todayAppointments?.map(app => (
              <div key={app.id} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-sm">{app.timeSlot}</div>
                  <div className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider
                    ${app.status === 'pending' ? 'bg-amber-900/30 text-amber-500' :
                      app.status === 'confirmed' ? 'bg-blue-900/30 text-blue-400' :
                      'bg-green-900/30 text-green-500'}`}
                  >
                    {app.status}
                  </div>
                </div>
                <div className="font-bold text-sm truncate">{app.customerName}</div>
                <div className="text-xs text-muted-foreground flex justify-between">
                  <span>{app.serviceName}</span>
                  <span>{app.staffName}</span>
                </div>
              </div>
            ))}
            {!loadingToday && (!todayAppointments || todayAppointments.length === 0) && (
              <div className="text-center text-muted-foreground py-8 text-sm">No appointments today.</div>
            )}
          </div>
        </div>
      </div>

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
