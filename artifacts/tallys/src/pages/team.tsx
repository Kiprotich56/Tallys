import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useListStaff } from "@workspace/api-client-react";
import { Star, Instagram, Facebook, Twitter, ChevronLeft, ChevronRight, X } from "lucide-react";

interface PortfolioImage {
  id: number;
  staffId: number;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
}

function PortfolioGallery({ staffId, staffName }: { staffId: number; staffName: string }) {
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/staff/${staffId}/portfolio`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(setImages)
      .catch(() => {});
  }, [staffId]);

  if (images.length === 0) return null;

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = () => setLightboxIndex(prev => prev !== null ? (prev - 1 + images.length) % images.length : null);
  const nextImage = () => setLightboxIndex(prev => prev !== null ? (prev + 1) % images.length : null);

  return (
    <div className="mt-4">
      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Portfolio</h4>
      <div className="grid grid-cols-3 gap-1.5">
        {images.slice(0, 6).map((img, i) => (
          <button
            key={img.id}
            onClick={() => openLightbox(i)}
            className="aspect-square rounded overflow-hidden bg-muted relative group"
          >
            <img
              src={img.imageUrl}
              alt={img.caption ?? `Portfolio by ${staffName}`}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
            {i === 5 && images.length > 6 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-sm">
                +{images.length - 6}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={closeLightbox}
          >
            <X className="w-6 h-6" />
          </button>
          <button
            className="absolute left-4 text-white/80 hover:text-white"
            onClick={e => { e.stopPropagation(); prevImage(); }}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <div className="max-w-3xl max-h-full" onClick={e => e.stopPropagation()}>
            <img
              src={images[lightboxIndex].imageUrl}
              alt={images[lightboxIndex].caption ?? ""}
              className="max-w-full max-h-[80vh] object-contain rounded"
            />
            {images[lightboxIndex].caption && (
              <p className="text-white/70 text-center mt-2 text-sm">{images[lightboxIndex].caption}</p>
            )}
            <p className="text-white/40 text-center text-xs mt-1">{lightboxIndex + 1} / {images.length}</p>
          </div>
          <button
            className="absolute right-4 text-white/80 hover:text-white"
            onClick={e => { e.stopPropagation(); nextImage(); }}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function TeamPage() {
  const { data: staff, isLoading } = useListStaff();

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Meet Our Experts</h1>
        <p className="text-muted-foreground text-lg">
          Our team of master barbers and beauty specialists are dedicated to perfecting your look.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">Loading team profiles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {staff?.filter(s => s.isActive).map((member, i) => {
            const socialLinks = (member as any).socialLinks as Record<string, string> | null;
            return (
              <div key={member.id} className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
                <div className="aspect-square bg-muted relative overflow-hidden">
                  <img
                    src={member.photoUrl || `/team-${(i % 3) + 1}.png`}
                    alt={member.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-1">
                    <h2 className="text-xl font-bold font-serif">{member.name}</h2>
                    {member.rating && (
                      <div className="flex items-center gap-1 text-primary text-sm font-medium">
                        <Star className="w-4 h-4 fill-primary" />
                        {member.rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                  <p className="text-primary text-sm font-medium mb-1">{member.role}</p>
                  <p className="text-xs text-muted-foreground mb-3">{member.completedServices} services completed</p>

                  <p className="text-muted-foreground text-sm mb-4 flex-1">
                    {member.bio || "Dedicated professional with years of experience in the industry."}
                  </p>

                  {member.specializations?.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Specializations</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {member.specializations.map(spec => (
                          <span key={spec} className="px-2 py-0.5 bg-background border border-border rounded text-xs">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Social links */}
                  {socialLinks && Object.keys(socialLinks).length > 0 && (
                    <div className="flex gap-3 mb-4">
                      {socialLinks.instagram && (
                        <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors">
                          <Instagram className="w-4 h-4" />
                        </a>
                      )}
                      {socialLinks.facebook && (
                        <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors">
                          <Facebook className="w-4 h-4" />
                        </a>
                      )}
                      {socialLinks.twitter && (
                        <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors">
                          <Twitter className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Portfolio gallery */}
                  <PortfolioGallery staffId={member.id} staffName={member.name} />

                  <Link
                    href="/book"
                    className="w-full text-center h-10 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90 mt-4"
                  >
                    Book with {member.name.split(' ')[0]}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
