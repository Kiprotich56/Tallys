import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListStaff, useCreateStaff, useUpdateStaff, useDeleteStaff,
  getListStaffQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Star, Trash2, Image, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const staffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  bio: z.string().optional(),
  photoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  commissionPct: z.coerce.number().min(0).max(100),
  isActive: z.boolean().default(true),
  specializationsRaw: z.string().default(""),
  instagramUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
});

type StaffFormValues = z.infer<typeof staffSchema>;

interface PortfolioImage {
  id: number;
  staffId: number;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
}

function PortfolioManager({ staffId, staffName }: { staffId: number; staffName: string }) {
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  async function fetchPortfolio() {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/${staffId}/portfolio`, { credentials: "include" });
      if (res.ok) setImages(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPortfolio(); }, [staffId]);

  async function addByUrl() {
    if (!newUrl.trim()) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/staff/${staffId}/portfolio`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: newUrl.trim(), caption: newCaption.trim() || null }),
      });
      if (res.ok) {
        toast({ title: "Image added to portfolio" });
        setNewUrl(""); setNewCaption(""); fetchPortfolio();
      } else {
        toast({ title: "Failed to add image", variant: "destructive" });
      }
    } finally {
      setUploading(false);
    }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    if (newCaption.trim()) formData.append("caption", newCaption.trim());
    setUploading(true);
    try {
      const res = await fetch(`/api/staff/${staffId}/portfolio`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        toast({ title: "Image uploaded" });
        setNewCaption(""); fetchPortfolio();
        e.target.value = "";
      } else {
        toast({ title: "Upload failed", variant: "destructive" });
      }
    } finally {
      setUploading(false);
    }
  }

  async function deleteImage(imageId: number) {
    try {
      const res = await fetch(`/api/staff/${staffId}/portfolio/${imageId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Image removed" });
        fetchPortfolio();
      }
    } catch {
      toast({ title: "Failed to remove image", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Image className="w-4 h-4 text-primary" />
        Portfolio for {staffName}
      </h3>

      {/* Add by URL or upload */}
      <div className="bg-background rounded-lg p-4 border border-border space-y-3">
        <Input
          placeholder="Caption (optional)"
          value={newCaption}
          onChange={e => setNewCaption(e.target.value)}
        />
        <div className="flex gap-2">
          <Input
            placeholder="Image URL..."
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            className="flex-1"
          />
          <Button size="sm" onClick={addByUrl} disabled={uploading || !newUrl.trim()}>
            Add URL
          </Button>
        </div>
        <div className="text-center">
          <span className="text-xs text-muted-foreground">— or upload a file —</span>
        </div>
        <label className={`flex items-center justify-center gap-2 w-full h-9 rounded-md border border-dashed border-border cursor-pointer hover:bg-accent/10 transition-colors text-sm text-muted-foreground ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
          <Upload className="w-4 h-4" />
          {uploading ? "Uploading..." : "Choose File (max 5MB)"}
          <input type="file" accept="image/*" className="hidden" onChange={uploadFile} disabled={uploading} />
        </label>
      </div>

      {/* Gallery */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading portfolio...</div>
      ) : images.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
          No portfolio images yet. Add some above.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {images.map(img => (
            <div key={img.id} className="relative group">
              <div className="aspect-square rounded overflow-hidden bg-muted">
                <img
                  src={img.imageUrl}
                  alt={img.caption ?? "Portfolio"}
                  className="w-full h-full object-cover"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }}
                />
              </div>
              {img.caption && (
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{img.caption}</p>
              )}
              <button
                onClick={() => deleteImage(img.id)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminStaff() {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [portfolioStaff, setPortfolioStaff] = useState<{ id: number; name: string } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: staff, isLoading } = useListStaff();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "", role: "Barber", bio: "", photoUrl: "", commissionPct: 50,
      isActive: true, specializationsRaw: "",
      instagramUrl: "", facebookUrl: "", twitterUrl: "", tiktokUrl: "",
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });

  const buildPayload = (values: StaffFormValues) => {
    const socialLinks: Record<string, string> = {};
    if (values.instagramUrl?.trim()) socialLinks.instagram = values.instagramUrl.trim();
    if (values.facebookUrl?.trim()) socialLinks.facebook = values.facebookUrl.trim();
    if (values.twitterUrl?.trim()) socialLinks.twitter = values.twitterUrl.trim();
    if (values.tiktokUrl?.trim()) socialLinks.tiktok = values.tiktokUrl.trim();

    return {
      name: values.name,
      role: values.role,
      bio: values.bio,
      photoUrl: values.photoUrl || undefined,
      commissionPct: values.commissionPct,
      isActive: values.isActive,
      specializations: values.specializationsRaw.split(",").map(s => s.trim()).filter(Boolean),
      socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : null,
    };
  };

  const onSubmit = (values: StaffFormValues) => {
    const data = buildPayload(values);
    if (editingId) {
      updateStaff.mutate({ id: editingId, data }, {
        onSuccess: () => { invalidate(); setIsDialogOpen(false); form.reset(); toast({ title: "Staff updated" }); },
        onError: () => toast({ title: "Failed to update staff", variant: "destructive" }),
      });
    } else {
      createStaff.mutate({ data }, {
        onSuccess: () => { invalidate(); setIsDialogOpen(false); form.reset(); toast({ title: "Staff member created" }); },
        onError: () => toast({ title: "Failed to create staff member", variant: "destructive" }),
      });
    }
  };

  const handleEdit = (member: any) => {
    setEditingId(member.id);
    const sl = member.socialLinks ?? {};
    form.reset({
      name: member.name,
      role: member.role,
      bio: member.bio || "",
      photoUrl: member.photoUrl || "",
      commissionPct: member.commissionPct ?? 50,
      isActive: member.isActive,
      specializationsRaw: member.specializations?.join(", ") ?? "",
      instagramUrl: sl.instagram ?? "",
      facebookUrl: sl.facebook ?? "",
      twitterUrl: sl.twitter ?? "",
      tiktokUrl: sl.tiktok ?? "",
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingId(null);
    form.reset({ name: "", role: "Barber", bio: "", photoUrl: "", commissionPct: 50, isActive: true, specializationsRaw: "", instagramUrl: "", facebookUrl: "", twitterUrl: "", tiktokUrl: "" });
    setIsDialogOpen(true);
  };

  // Photo uploads reuse the staff record's id, so a brand-new staff member
  // must be saved once (with a URL, or left blank) before a file can be
  // uploaded — same pattern as service images.
  const uploadStaffPhoto = async (file: File) => {
    if (!editingId) return;
    const formData = new FormData();
    formData.append("photo", file);
    setUploadingPhoto(true);
    try {
      const res = await fetch(`/api/staff/${editingId}/photo`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      form.setValue("photoUrl", updated.photoUrl ?? "");
      invalidate();
      toast({ title: "Photo uploaded" });
    } catch {
      toast({ title: "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteStaff.mutate({ id: deleteTarget.id }, {
      onSuccess: () => { invalidate(); setDeleteTarget(null); toast({ title: "Staff member removed" }); },
      onError: () => toast({ title: "Failed to remove staff member", variant: "destructive" }),
    });
  };

  const filteredStaff = staff?.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">Staff Management</h1>
          <p className="text-muted-foreground text-sm">Manage professionals, commissions, portfolio, and performance.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <select {...field} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                          <option>Barber</option>
                          <option>Master Barber</option>
                          <option>Stylist</option>
                          <option>Hair Stylist</option>
                          <option>Beauty Therapist</option>
                          <option>Nail Technician</option>
                          <option>Receptionist</option>
                        </select>
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="specializationsRaw" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specializations (comma-separated)</FormLabel>
                    <FormControl><Input placeholder="Fades, Dreadlocks, Dyeing" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="photoUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photo</FormLabel>
                    <FormControl><Input placeholder="https://example.com/photo.jpg" {...field} /></FormControl>
                    <FormMessage />
                    <div className="flex items-center gap-3 mt-1">
                      {field.value && (
                        <img src={field.value} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-border flex-shrink-0" onError={e => (e.currentTarget.style.display = 'none')} />
                      )}
                      <label className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md border border-dashed border-border cursor-pointer hover:bg-accent/10 transition-colors text-xs text-muted-foreground ${(!editingId || uploadingPhoto) ? "opacity-50 pointer-events-none" : ""}`}>
                        <Upload className="w-3.5 h-3.5" />
                        {uploadingPhoto ? "Uploading..." : editingId ? "Or upload a file (max 5MB)" : "Save profile once to enable file upload"}
                        <input type="file" accept="image/*" className="hidden" disabled={!editingId || uploadingPhoto}
                          onChange={e => { const file = e.target.files?.[0]; if (file) uploadStaffPhoto(file); e.target.value = ""; }} />
                      </label>
                    </div>
                  </FormItem>
                )} />

                <FormField control={form.control} name="commissionPct" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission (%)</FormLabel>
                    <FormControl><Input type="number" min={0} max={100} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="bio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Short biography..." rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Social links */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Social Links (Optional)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="instagramUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Instagram URL</FormLabel>
                        <FormControl><Input placeholder="https://instagram.com/..." {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="facebookUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Facebook URL</FormLabel>
                        <FormControl><Input placeholder="https://facebook.com/..." {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="twitterUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">X / Twitter URL</FormLabel>
                        <FormControl><Input placeholder="https://x.com/..." {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="tiktokUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">TikTok URL</FormLabel>
                        <FormControl><Input placeholder="https://tiktok.com/@..." {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>

                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <p className="text-sm text-muted-foreground">Staff appears in the booking flow</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createStaff.isPending || updateStaff.isPending}>
                    {editingId ? "Save Changes" : "Create Profile"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Staff Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteStaff.isPending}>
              {deleteStaff.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Portfolio dialog */}
      <Dialog open={!!portfolioStaff} onOpenChange={o => !o && setPortfolioStaff(null)}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          {portfolioStaff && (
            <PortfolioManager staffId={portfolioStaff.id} staffName={portfolioStaff.name} />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center max-w-md relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Mobile cards + desktop table */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading staff...</div>
        ) : filteredStaff?.map(member => (
          <div key={member.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex-shrink-0 overflow-hidden">
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary font-bold text-sm">{member.name.charAt(0)}</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{member.name}</div>
                <div className="text-sm text-primary">{member.role}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${member.isActive ? "bg-green-900/30 text-green-500" : "bg-muted text-muted-foreground"}`}>
                {member.isActive ? "Active" : "Off"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div><span className="text-muted-foreground">Rating: </span><span className="font-medium">{member.rating?.toFixed(1) ?? "N/A"}</span></div>
              <div><span className="text-muted-foreground">Services: </span><span className="font-medium">{member.completedServices || 0}</span></div>
              <div><span className="text-muted-foreground">Comm: </span><span className="font-medium">{member.commissionPct}%</span></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => handleEdit(member)}>
                <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
              </Button>
              <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => setPortfolioStaff({ id: member.id, name: member.name })}>
                <Image className="w-3.5 h-3.5 mr-1.5" /> Portfolio
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget({ id: member.id, name: member.name })}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && filteredStaff?.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No staff found.</div>
        )}
      </div>

      <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background text-muted-foreground text-xs uppercase tracking-wider text-left border-b border-border">
              <tr>
                <th className="p-4 font-medium">Professional</th>
                <th className="p-4 font-medium">Metrics</th>
                <th className="p-4 font-medium">Specializations</th>
                <th className="p-4 font-medium">Comm. %</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading staff...</td></tr>
              ) : filteredStaff?.map(member => (
                <tr key={member.id} className="hover:bg-accent/5">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex-shrink-0 overflow-hidden">
                        {member.photoUrl ? (
                          <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary font-bold text-sm">{member.name.charAt(0)}</div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold">{member.name}</div>
                        <div className="text-sm text-primary">{member.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-sm font-medium mb-1">
                      <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                      {member.rating ? member.rating.toFixed(1) : "N/A"}
                    </div>
                    <div className="text-xs text-muted-foreground">{member.completedServices || 0} services</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {member.specializations?.slice(0, 2).map(spec => (
                        <span key={spec} className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] uppercase">{spec}</span>
                      ))}
                      {member.specializations && member.specializations.length > 2 && (
                        <span className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">+{member.specializations.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-medium">{member.commissionPct}%</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${member.isActive ? "bg-green-900/30 text-green-500" : "bg-muted text-muted-foreground"}`}>
                      {member.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setPortfolioStaff({ id: member.id, name: member.name })} className="h-8 px-2 text-muted-foreground hover:text-primary">
                        <Image className="w-4 h-4 mr-1" /> Portfolio
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(member)} className="h-8 px-2 text-muted-foreground hover:text-primary">
                        <Edit2 className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ id: member.id, name: member.name })} className="h-8 px-2 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredStaff?.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No staff found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
