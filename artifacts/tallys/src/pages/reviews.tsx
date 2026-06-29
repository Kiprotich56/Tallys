import { useState, useEffect } from "react";
import { useListReviews } from "@workspace/api-client-react";
import { Star, Quote } from "lucide-react";

export default function ReviewsPage() {
  const { data: reviews, isLoading } = useListReviews();
  const [directReviews, setDirectReviews] = useState<any[] | null>(null);

  useEffect(() => {
    fetch('/api/reviews')
      .then(r => r.json())
      .then((data: any[]) => setDirectReviews(data))
      .catch(() => setDirectReviews([]));
  }, []);

  const displayReviews = (reviews && reviews.length > 0)
    ? reviews.filter(r => r.status === "approved")
    : (directReviews ?? []).filter((r: any) => r.status === "approved");

  const loading = isLoading && directReviews === null;

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Client Experiences</h1>
        <p className="text-muted-foreground text-lg">
          Don't just take our word for it. Here's what our distinguished clients have to say about their Tally's experience.
        </p>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">Loading reviews...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {displayReviews.map((review: any) => (
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
              No reviews available yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
