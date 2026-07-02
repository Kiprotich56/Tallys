import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApproveReview, useHideReview, getListReviewsQueryKey } from "@workspace/api-client-react";
import { Star, Check, EyeOff, RefreshCw, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

type ReviewStatus = "all" | "pending" | "approved" | "hidden";
type SortKey = "newest" | "oldest" | "rating_high" | "rating_low";

export default function AdminReviews() {
  const [filter, setFilter] = useState<ReviewStatus>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const approveReview = useApproveReview();
  const hideReview = useHideReview();

  const fetchReviews = () => {
    setLoading(true);
    fetch("/api/admin/reviews", { credentials: "include" })
      .then(r => r.json())
      .then(data => { setReviews(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setReviews([]); setLoading(false); });
  };

  useEffect(() => { fetchReviews(); }, []);

  const handleApprove = (id: number) => {
    approveReview.mutate({ id }, {
      onSuccess: () => {
        fetchReviews();
        queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() });
        toast({ title: "Review approved and published" });
      },
      onError: () => toast({ title: "Failed to approve review", variant: "destructive" }),
    });
  };

  const handleHide = (id: number) => {
    hideReview.mutate({ id }, {
      onSuccess: () => {
        fetchReviews();
        queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() });
        toast({ title: "Review hidden from public" });
      },
      onError: () => toast({ title: "Failed to hide review", variant: "destructive" }),
    });
  };

  const sorted = [...reviews].sort((a, b) => {
    if (sort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sort === "rating_high") return b.rating - a.rating;
    if (sort === "rating_low") return a.rating - b.rating;
    return 0;
  });

  const filtered = sorted.filter(r => filter === "all" || r.status === filter);

  const counts = {
    all: reviews.length,
    pending: reviews.filter(r => r.status === "pending").length,
    approved: reviews.filter(r => r.status === "approved").length,
    hidden: reviews.filter(r => r.status === "hidden").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-900/30 text-green-500";
      case "pending": return "bg-amber-900/30 text-amber-500";
      case "hidden": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">Reviews</h1>
          <p className="text-muted-foreground text-sm">Moderate customer reviews before they appear on the public site.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReviews} className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["all", "pending", "approved", "hidden"] as ReviewStatus[]).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`p-4 rounded-lg border text-left transition-colors ${
              filter === s ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <div className="text-2xl font-bold">{counts[s]}</div>
            <div className="text-xs text-muted-foreground capitalize mt-1">{s === "all" ? "Total Reviews" : `${s} Reviews`}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Sort by:</span>
        {([
          { key: "newest", label: "Newest" },
          { key: "oldest", label: "Oldest" },
          { key: "rating_high", label: "Highest Rating" },
          { key: "rating_low", label: "Lowest Rating" },
        ] as { key: SortKey; label: string }[]).map(opt => (
          <button
            key={opt.key}
            onClick={() => setSort(opt.key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              sort === opt.key
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-muted-foreground py-12">Loading reviews...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 bg-card border border-border rounded-lg">
            No {filter === "all" ? "" : filter} reviews found.
          </div>
        ) : (
          filtered.map(review => (
            <div key={review.id} className="bg-card border border-border rounded-lg p-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {review.customerName?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <div className="font-bold">{review.customerName || "Anonymous"}</div>
                      <div className="text-xs text-muted-foreground">
                        {review.serviceName && <span className="text-primary">{review.serviceName}</span>}
                        {review.createdAt && (
                          <span className="ml-2">{format(parseISO(review.createdAt), "MMM d, yyyy")}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? "fill-primary text-primary" : "fill-muted/30 text-muted/30"}`}
                      />
                    ))}
                    <span className="text-sm text-muted-foreground ml-2">{review.rating}/5</span>
                  </div>

                  {review.comment && (
                    <p className="text-sm text-muted-foreground leading-relaxed">"{review.comment}"</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3 flex-shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${getStatusBadge(review.status)}`}>
                    {review.status}
                  </span>

                  <div className="flex gap-2">
                    {review.status !== "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(review.id)}
                        disabled={approveReview.isPending}
                        className="flex items-center gap-1.5 text-green-500 border-green-500/30 hover:bg-green-500/10"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </Button>
                    )}
                    {review.status !== "hidden" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleHide(review.id)}
                        disabled={hideReview.isPending}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <EyeOff className="w-3.5 h-3.5" /> Hide
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
