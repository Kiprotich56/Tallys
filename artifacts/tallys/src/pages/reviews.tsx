import { useState } from "react";
import { useListReviews, useListServices } from "@workspace/api-client-react";
import { Star, Quote, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ReviewsPage() {
  const { data: reviews, isLoading } = useListReviews();
  const { data: services } = useListServices();
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", serviceId: "", comment: "", rating: 5 });

  const displayReviews = (reviews ?? []).filter((r) => r.status === "approved");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.comment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: form.name.trim(),
          serviceId: form.serviceId ? Number(form.serviceId) : undefined,
          rating: form.rating,
          comment: form.comment.trim(),
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        setForm({ name: "", serviceId: "", comment: "", rating: 5 });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Client Experiences</h1>
        <p className="text-muted-foreground text-lg">
          Don't just take our word for it. Here's what our distinguished clients have to say about their Tally's experience.
        </p>
        {!showForm && !submitted && (
          <Button onClick={() => setShowForm(true)} className="mt-6" variant="outline">
            Leave a Review
          </Button>
        )}
      </div>

      {/* Review submission form */}
      {submitted ? (
        <div className="max-w-md mx-auto mb-16 bg-card border border-border rounded-lg p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-2">Thank you for your review!</h3>
          <p className="text-muted-foreground text-sm">Your review has been submitted and is pending approval. We appreciate your feedback.</p>
          <Button variant="ghost" size="sm" className="mt-4" onClick={() => { setSubmitted(false); setShowForm(false); }}>
            Close
          </Button>
        </div>
      ) : showForm && (
        <div className="max-w-md mx-auto mb-16 bg-card border border-border rounded-lg p-8">
          <h2 className="text-xl font-serif font-bold mb-6">Share Your Experience</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="review-name">Your Name *</Label>
              <Input
                id="review-name"
                required
                placeholder="John Doe"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="review-service">Service Received</Label>
              <select
                id="review-service"
                value={form.serviceId}
                onChange={e => setForm({ ...form, serviceId: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">— Select a service —</option>
                {services?.filter(s => s.isActive).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Rating *</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setForm({ ...form, rating: star })}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${star <= form.rating ? "fill-primary text-primary" : "fill-muted text-muted"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="review-comment">Your Comment *</Label>
              <Textarea
                id="review-comment"
                required
                placeholder="Tell us about your experience..."
                value={form.comment}
                onChange={e => setForm({ ...form, comment: e.target.value })}
                className="mt-1 resize-none"
                rows={4}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting} className="flex-1 gap-2">
                <Send className="w-4 h-4" />
                {submitting ? "Submitting..." : "Submit Review"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Your review will be visible after approval.
            </p>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-muted-foreground">Loading reviews...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {displayReviews.map((review) => (
            <div key={review.id} className="bg-card border border-border p-8 rounded-lg relative">
              <Quote className="absolute top-6 right-6 w-8 h-8 text-muted/20" />
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < review.rating ? "fill-primary text-primary" : "fill-muted text-muted"}`}
                  />
                ))}
              </div>
              <p className="text-muted-foreground mb-6 line-clamp-4 relative z-10">
                "{review.comment}"
              </p>
              <div>
                <p className="font-bold text-foreground">{review.customerName}</p>
                <p className="text-sm text-primary">{review.serviceName}</p>
              </div>
            </div>
          ))}

          {displayReviews.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-12">
              No reviews yet — be the first to share your experience!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
