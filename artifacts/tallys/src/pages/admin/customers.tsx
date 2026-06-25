import { useState } from "react";
import { useListCustomers } from "@workspace/api-client-react";
import { Search, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminCustomers() {
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useListCustomers({ search });

  const getTierColor = (tier: string) => {
    switch(tier.toLowerCase()) {
      case 'platinum': return 'bg-slate-200 text-slate-800';
      case 'gold': return 'bg-primary text-primary-foreground';
      case 'silver': return 'bg-slate-400 text-slate-900';
      default: return 'bg-amber-700 text-white';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">Customers</h1>
          <p className="text-muted-foreground text-sm">View client history and manage loyalty statuses.</p>
        </div>
      </div>

      <div className="flex items-center w-full max-w-md relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          className="pl-9"
          placeholder="Search by name, phone or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background text-muted-foreground text-xs uppercase tracking-wider text-left border-b border-border">
              <tr>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Contact</th>
                <th className="p-4 font-medium">Loyalty Tier</th>
                <th className="p-4 font-medium">Total Visits</th>
                <th className="p-4 font-medium">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading customers...</td></tr>
              ) : customers?.map(customer => (
                <tr key={customer.id} className="hover:bg-accent/5">
                  <td className="p-4">
                    <div className="font-bold flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold uppercase">
                        {customer.name.charAt(0)}
                      </div>
                      {customer.name}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">{customer.phone}</div>
                    {customer.email && <div className="text-xs text-muted-foreground mt-0.5">{customer.email}</div>}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${getTierColor(customer.loyaltyTier)}`}>
                      <Crown className="w-3 h-3" />
                      {customer.loyaltyTier}
                    </span>
                    <div className="text-xs text-muted-foreground mt-1.5 ml-1">
                      {customer.loyaltyPoints} points
                    </div>
                  </td>
                  <td className="p-4 font-medium">{customer.totalVisits}</td>
                  <td className="p-4 font-bold text-primary">KSh {customer.totalSpentKes.toLocaleString()}</td>
                </tr>
              ))}
              {customers?.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}