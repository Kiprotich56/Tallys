import { useGetDashboardSummary, useGetRevenueTrend, useGetTodayAppointments, useGetStaffPerformance } from "@workspace/api-client-react";
import { Users, Calendar, TrendingUp, CheckCircle, Scissors, DollarSign } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: revenueTrend, isLoading: loadingTrend } = useGetRevenueTrend();
  const { data: todayAppointments, isLoading: loadingToday } = useGetTodayAppointments();
  const { data: staffPerformance, isLoading: loadingStaff } = useGetStaffPerformance();

  if (loadingSummary) return <div className="p-8">Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-serif mb-1">Overview</h1>
        <p className="text-muted-foreground">Welcome to Tally's Admin Dashboard.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Daily Revenue</h3>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">KSh {summary?.dailyRevenue?.toLocaleString() || 0}</div>
        </div>
        
        <div className="bg-card border border-border p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Monthly Revenue</h3>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">KSh {summary?.monthlyRevenue?.toLocaleString() || 0}</div>
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
        {/* Revenue Chart */}
        <div className="bg-card border border-border p-6 rounded-lg lg:col-span-2">
          <h3 className="text-lg font-bold mb-6">Revenue Trend (30 Days)</h3>
          <div className="h-[300px]">
            {!loadingTrend && revenueTrend && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="date" stroke="#888" tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} />
                  <YAxis stroke="#888" tickFormatter={(val) => `KSh ${val / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333' }}
                    itemStyle={{ color: '#D4AF37' }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={2} dot={false} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Today's Appointments */}
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
                  <div className="font-medium">{app.timeSlot}</div>
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
            {todayAppointments?.length === 0 && (
              <div className="text-center text-muted-foreground py-8">No appointments today.</div>
            )}
          </div>
        </div>
      </div>

      {/* Staff Performance Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-bold">Staff Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background text-muted-foreground text-xs uppercase tracking-wider text-left">
              <tr>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Services Completed</th>
                <th className="p-4 font-medium">Revenue Generated</th>
                <th className="p-4 font-medium">Avg Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!loadingStaff && staffPerformance?.map(staff => (
                <tr key={staff.staffId} className="hover:bg-accent/5">
                  <td className="p-4 font-medium flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                      {staff.name.charAt(0)}
                    </div>
                    {staff.name}
                  </td>
                  <td className="p-4">{staff.completedServices}</td>
                  <td className="p-4 text-primary font-medium">KSh {staff.revenueKes.toLocaleString()}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-primary text-primary" />
                      {staff.avgRating ? staff.avgRating.toFixed(1) : 'N/A'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Temporary Star icon
function Star(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}