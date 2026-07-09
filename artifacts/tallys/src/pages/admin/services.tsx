import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListServices, useCreateService, useUpdateService, useDeleteService,
  getListServicesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Scissors, Plus, Search, Edit2, Trash2, Upload, Image as ImageIcon } from "lucide-react";
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

const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  priceKes: z.coerce.number().min(0),
  durationMinutes: z.coerce.number().min(1),
  isActive: z.boolean().default(true),
  imageUrl: z.string().optional(),
});

export default function AdminServices() {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: services, isLoading } = useListServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [uploading, setUploading] = useState(false);

  const form = useForm<z.infer<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { name: "", description: "", category: "", priceKes: 0, durationMinutes: 30, isActive: true, imageUrl: "" },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });

  const onSubmit = (data: z.infer<typeof serviceSchema>) => {
    if (editingId) {
      updateService.mutate({ id: editingId, data }, {
        onSuccess: () => { invalidate(); setIsDialogOpen(false); form.reset(); toast({ title: "Service updated" }); },
        onError: () => toast({ title: "Failed to update service", variant: "destructive" }),
      });
    } else {
      createService.mutate({ data }, {
        onSuccess: () => { invalidate(); setIsDialogOpen(false); form.reset(); toast({ title: "Service created" }); },
        onError: () => toast({ title: "Failed to create service", variant: "destructive" }),
      });
    }
  };

  const handleEdit = (service: any) => {
    setEditingId(service.id);
    form.reset({
      name: service.name,
      description: service.description || "",
      category: service.category,
      priceKes: service.priceKes,
      durationMinutes: service.durationMinutes,
      isActive: service.isActive,
      imageUrl: service.imageUrl || "",
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingId(null);
    form.reset({ name: "", description: "", category: "", priceKes: 0, durationMinutes: 30, isActive: true, imageUrl: "" });
    setIsDialogOpen(true);
  };

  // Services can only receive a file upload once they exist (the upload
  // endpoint needs an id), so new services fall back to the imageUrl text
  // field until saved once.
  const uploadServiceImage = async (file: File) => {
    if (!editingId) return;
    const formData = new FormData();
    formData.append("image", file);
    setUploading(true);
    try {
      const res = await fetch(`/api/services/${editingId}/image`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      form.setValue("imageUrl", updated.imageUrl ?? "");
      invalidate();
      toast({ title: "Image uploaded" });
    } catch {
      toast({ title: "Failed to upload image", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteService.mutate({ id: deleteTarget.id }, {
      onSuccess: () => { invalidate(); setDeleteTarget(null); toast({ title: "Service deleted" }); },
      onError: () => toast({ title: "Failed to delete service", variant: "destructive" }),
    });
  };

  const filteredServices = services?.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">Services</h1>
          <p className="text-muted-foreground text-sm">Manage the services offered by Tally's.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Service" : "Add New Service"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Full Pedicure" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl><Input placeholder="e.g. Haircuts, Dye Services..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="priceKes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (KSh)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (mins)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Details about this service..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Image</FormLabel>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0 flex items-center justify-center">
                        {field.value ? (
                          <img src={field.value} alt="Service" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <FormControl>
                          <Input placeholder="Image URL (optional)" {...field} />
                        </FormControl>
                        <label className={`flex items-center justify-center gap-2 w-full h-9 rounded-md border border-dashed border-border text-xs text-muted-foreground transition-colors ${
                          editingId ? "cursor-pointer hover:bg-accent/10" : "opacity-50 cursor-not-allowed"
                        } ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                          <Upload className="w-3.5 h-3.5" />
                          {uploading ? "Uploading..." : editingId ? "Upload image (max 5MB)" : "Save service first to upload a file"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={!editingId || uploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadServiceImage(file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <p className="text-sm text-muted-foreground">Customers can book this service</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createService.isPending || updateService.isPending}>
                    {editingId ? "Save Changes" : "Create Service"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteService.isPending}>
              {deleteService.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center max-w-md relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background text-muted-foreground text-xs uppercase tracking-wider text-left border-b border-border">
              <tr>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Price</th>
                <th className="p-4 font-medium">Duration</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading services...</td></tr>
              ) : filteredServices?.map(service => (
                <tr key={service.id} className="hover:bg-accent/5">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0 flex items-center justify-center">
                        {service.imageUrl ? (
                          <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold">{service.name}</div>
                        {service.description && <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{service.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm">{service.category}</td>
                  <td className="p-4 font-medium text-primary">KSh {service.priceKes.toLocaleString()}</td>
                  <td className="p-4 text-sm text-muted-foreground">{service.durationMinutes}m</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                      service.isActive ? "bg-green-900/30 text-green-500" : "bg-muted text-muted-foreground"
                    }`}>
                      {service.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(service)} className="h-8 px-2 text-muted-foreground hover:text-primary">
                        <Edit2 className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ id: service.id, name: service.name })} className="h-8 px-2 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredServices?.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No services found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
