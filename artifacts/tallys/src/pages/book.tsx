import { useState, useEffect } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  useListServices,
  useListStaff,
  useGetStaffAvailability,
  useCreateAppointment,
  useCreateCustomer,
  getGetStaffAvailabilityQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Scissors,
  User,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  Info,
} from "lucide-react";

// Steps: 1=Service, 2=Staff, 3=DateTime, 4=Details, 5=Confirm
export default function BookPage() {
  const [step, setStep] = useState(1);
  const { user } = useAuth();

  // Booking state
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [detailsService, setDetailsService] = useState<any | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState({ name: "", phone: "", email: "", notes: "" });
  const [clientDob, setClientDob] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");

  const calcAge = (dobStr: string): number | null => {
    if (!dobStr) return null;
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
    return age;
  };

  const clientAge = calcAge(clientDob);
  const isMinor = clientAge !== null && clientAge < 18;

  // Pre-fill customer data from logged-in user
  useEffect(() => {
    if (user) {
      setCustomerData(prev => ({
        ...prev,
        name: prev.name || user.name || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  const { data: services, isLoading: loadingServices } = useListServices();
  const { data: staff, isLoading: loadingStaff } = useListStaff();

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const availabilityParams = { staffId: selectedStaffId!, date: formattedDate };
  const { data: availability, isLoading: loadingAvailability } = useGetStaffAvailability(
    availabilityParams,
    { query: { enabled: !!selectedStaffId && !!selectedDate, queryKey: getGetStaffAvailabilityQueryKey(availabilityParams) } }
  );

  const createCustomer = useCreateCustomer();
  const createAppointment = useCreateAppointment();

  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => s - 1);

  const handleServiceSelect = (id: number) => {
    setSelectedServiceId(id);
    handleNext();
  };

  const handleStaffSelect = (id: number) => {
    setSelectedStaffId(id);
    handleNext();
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined);
      setSelectedTimeSlot(null);
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return;
    setSelectedDate(date);
    setSelectedTimeSlot(null);
  };

  const handleTimeSlotSelect = (slot: string) => {
    setSelectedTimeSlot(slot);
    handleNext();
  };

  // Step 4 → 5: create/find customer + appointment, then show confirmation
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId || !selectedStaffId || !selectedDate || !selectedTimeSlot) return;
    if (isMinor && (!guardianName.trim() || !guardianPhone.trim())) {
      alert("This booking is for someone under 18. Please provide a parent/guardian name and phone number.");
      return;
    }
    try {
      let customerId: number;

      if (user?.customerId) {
        customerId = user.customerId;
      } else {
        const customer = await createCustomer.mutateAsync({
          data: {
            name: customerData.name,
            phone: customerData.phone,
            email: customerData.email || undefined,
          },
        });
        customerId = customer.id;
      }

      await createAppointment.mutateAsync({
        data: {
          customerId,
          serviceId: selectedServiceId,
          staffId: selectedStaffId,
          date: formattedDate,
          timeSlot: selectedTimeSlot,
          notes: customerData.notes || undefined,
          guardianName: isMinor ? guardianName.trim() : undefined,
          guardianPhone: isMinor ? guardianPhone.trim() : undefined,
        },
      });

      setStep(5);
    } catch (err: any) {
      const message =
        err?.data?.error ??
        err?.message ??
        "Something went wrong while sending your booking. Please try again.";
      if (err?.status === 409) {
        // Someone else grabbed this slot between selection and submission —
        // send the user back to pick a different time instead of just
        // failing silently.
        alert(`${message} Please choose another time.`);
        setSelectedTimeSlot(null);
        setStep(3);
      } else {
        alert(message);
      }
    }
  };

  const getServiceName = () => services?.find((s) => s.id === selectedServiceId)?.name;
  const getStaffName = () => staff?.find((s) => s.id === selectedStaffId)?.name;
  const getServicePrice = () =>
    services?.find((s) => s.id === selectedServiceId)?.priceKes.toLocaleString();

  const stepLabels = ["Service", "Professional", "Date & Time", "Your Details"];

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">Book an Appointment</h1>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground flex-wrap">
          {stepLabels.map((label, i) => (
            <span key={label} className="flex items-center gap-2">
              <span className={step >= i + 1 ? "text-primary font-bold" : ""}>{label}</span>
              {i < stepLabels.length - 1 && <ChevronRight className="w-4 h-4" />}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm min-h-[500px]">
        {/* ── STEP 1: Service ── */}
        {step === 1 && (
          <div className="p-6 md:p-8 animate-in fade-in">
            <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
              <Scissors className="text-primary w-6 h-6" /> Select Service
            </h2>
            {loadingServices ? (
              <div className="text-center py-12">Loading services...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services
                  ?.filter((s) => s.isActive)
                  .map((service) => (
                    <div
                      key={service.id}
                      onClick={() => handleServiceSelect(service.id)}
                      role="button"
                      tabIndex={0}
                      className={`text-left rounded-lg border transition-all cursor-pointer ${
                        selectedServiceId === service.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50 bg-background"
                      }`}
                    >
                      <div className="p-4 flex gap-3">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0 flex items-center justify-center">
                          {service.imageUrl ? (
                            <img
                              src={service.imageUrl}
                              alt={service.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Scissors className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <div className="font-bold">{service.name}</div>
                            <div className="text-primary font-medium text-sm whitespace-nowrap ml-3">
                              KSh {service.priceKes.toLocaleString()}
                            </div>
                          </div>
                          {service.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {service.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">{service.durationMinutes} mins</div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setDetailsService(service); }}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Info className="w-3 h-3" /> View more
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Staff ── */}
        {step === 2 && (
          <div className="p-6 md:p-8 animate-in fade-in">
            <div className="flex items-center mb-6">
              <Button variant="ghost" size="icon" onClick={handlePrev} className="mr-2">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
                <User className="text-primary w-6 h-6" /> Choose Professional
              </h2>
            </div>
            {loadingStaff ? (
              <div className="text-center py-12">Loading professionals...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {staff
                  ?.filter((s) => s.isActive)
                  .map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleStaffSelect(member.id)}
                      className={`text-left p-4 rounded-lg border transition-all flex flex-col items-center text-center ${
                        selectedStaffId === member.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50 bg-background"
                      }`}
                    >
                      <div className="w-20 h-20 rounded-full bg-muted overflow-hidden mb-3">
                        <img
                          src={member.photoUrl ?? `/team-1.png`}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="font-bold">{member.name}</div>
                      <div className="text-sm text-primary mb-2">{member.role}</div>
                      {member.rating && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          ★ {member.rating.toFixed(1)}
                        </div>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Date & Time ── */}
        {step === 3 && (
          <div className="p-6 md:p-8 animate-in fade-in">
            <div className="flex items-center mb-6">
              <Button variant="ghost" size="icon" onClick={handlePrev} className="mr-2">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
                <CalendarIcon className="text-primary w-6 h-6" /> Select Date & Time
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <Label className="mb-4 block text-base font-bold">1. Select Date</Label>
                <div className="border border-border rounded-lg p-2 bg-background inline-block">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="bg-transparent"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-4 block text-base font-bold">2. Select Time</Label>
                {!selectedDate ? (
                  <div className="text-muted-foreground p-8 text-center border border-dashed border-border rounded-lg">
                    Please select a date first
                  </div>
                ) : loadingAvailability ? (
                  <div className="text-center py-8">Loading available slots...</div>
                ) : availability?.slots && availability.slots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {availability.slots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => handleTimeSlotSelect(slot)}
                        className={`py-2 px-3 text-sm rounded border text-center transition-all ${
                          selectedTimeSlot === slot
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:border-primary/50"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground p-8 text-center border border-dashed border-border rounded-lg">
                    No slots available on this date
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Your Details ── */}
        {step === 4 && (
          <div className="p-6 md:p-8 animate-in fade-in">
            <div className="flex items-center mb-6">
              <Button variant="ghost" size="icon" onClick={handlePrev} className="mr-2">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-2xl font-serif font-bold">Your Details</h2>
            </div>

            {user && (
              <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                  {user.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <span>Booking as <strong>{user.name}</strong> — your details are pre-filled.</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                <div className="md:col-span-3">
                  <form onSubmit={handleDetailsSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        required
                        value={customerData.name}
                        onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {!user?.customerId && (
                        <div>
                          <Label htmlFor="phone">Phone Number *</Label>
                          <Input
                            id="phone"
                            required
                            placeholder="0712 345 678"
                            value={customerData.phone}
                            onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                      )}
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={customerData.email}
                          onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="dob">Date of Birth (of the person being booked for)</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={clientDob}
                        onChange={(e) => setClientDob(e.target.value)}
                        className="mt-1"
                        max={new Date().toISOString().slice(0, 10)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Used to check if a parent/guardian needs to make this booking.
                      </p>
                    </div>
                    {isMinor && (
                      <div className="space-y-4 p-4 rounded-lg border border-amber-500/40 bg-amber-500/10">
                        <p className="text-sm text-amber-200">
                          This booking is for someone under 18. A parent or guardian must provide their details below.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="guardianName">Parent/Guardian Name *</Label>
                            <Input
                              id="guardianName"
                              required
                              value={guardianName}
                              onChange={(e) => setGuardianName(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="guardianPhone">Parent/Guardian Phone *</Label>
                            <Input
                              id="guardianPhone"
                              required
                              placeholder="0712 345 678"
                              value={guardianPhone}
                              onChange={(e) => setGuardianPhone(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    <div>
                      <Label htmlFor="notes">Special Requests / Notes</Label>
                      <Textarea
                        id="notes"
                        value={customerData.notes}
                        onChange={(e) => setCustomerData({ ...customerData, notes: e.target.value })}
                        className="mt-1 resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="pt-4">
                      <Button
                        type="submit"
                        className="w-full h-12 text-lg"
                        disabled={createCustomer.isPending || createAppointment.isPending}
                      >
                        {createAppointment.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reserving slot...
                          </>
                        ) : (
                          "Confirm Booking →"
                        )}
                      </Button>
                    </div>
                  </form>
                </div>

                <div className="md:col-span-2">
                  <BookingSummaryCard
                    serviceName={getServiceName()}
                    staffName={getStaffName()}
                    date={selectedDate}
                    timeSlot={selectedTimeSlot}
                    priceKes={getServicePrice()}
                  />
                </div>
              </div>
          </div>
        )}

        {/* ── STEP 5: Confirmation ── */}
        {step === 5 && (
          <div className="p-12 text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-serif font-bold mb-4">Booking Confirmed!</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-3 text-lg">
              Thank you, {customerData.name}. Your appointment for{" "}
              <span className="text-foreground font-semibold">{getServiceName()}</span> with{" "}
              <span className="text-foreground font-semibold">{getStaffName()}</span> on{" "}
              {selectedDate ? format(selectedDate, "MMM do") : ""} at {selectedTimeSlot} is confirmed.
            </p>

            {/* Payment pending notice */}
            <div className="max-w-sm mx-auto mb-8 mt-4 bg-amber-900/20 border border-amber-700/40 rounded-lg p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-amber-400 font-semibold text-sm">Payment Pending</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Please pay <span className="text-foreground font-bold">KSh {getServicePrice()}</span> at the studio on arrival. Your booking is secured.
                </p>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button asChild variant="outline">
                <Link href="/">Return Home</Link>
              </Button>
              <Button asChild>
                <Link href="/portal">View My Appointments</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Service detail modal — full image + description, opened from "View more" */}
      <Dialog open={!!detailsService} onOpenChange={(o) => !o && setDetailsService(null)}>
        <DialogContent className="sm:max-w-lg">
          {detailsService && (
            <>
              {detailsService.imageUrl && (
                <div className="w-full h-56 -mt-2 rounded-lg overflow-hidden bg-muted">
                  <img src={detailsService.imageUrl} alt={detailsService.name} className="w-full h-full object-cover" />
                </div>
              )}
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-4">
                  <span>{detailsService.name}</span>
                  <span className="text-primary text-base whitespace-nowrap">
                    KSh {detailsService.priceKes.toLocaleString()}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-left pt-2 text-foreground/90">
                  {detailsService.description || "No description provided yet for this service."}
                </DialogDescription>
              </DialogHeader>
              <div className="text-sm text-muted-foreground border-t border-border pt-4 mt-2">
                {detailsService.category} · {detailsService.durationMinutes} mins
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Shared booking summary card ──────────────────────────────────────────────
function BookingSummaryCard({
  serviceName,
  staffName,
  date,
  timeSlot,
  priceKes,
}: {
  serviceName?: string;
  staffName?: string;
  date?: Date;
  timeSlot?: string | null;
  priceKes?: string;
}) {
  return (
    <Card className="bg-background/50">
      <CardContent className="p-6">
        <h3 className="font-bold border-b border-border pb-4 mb-4">Booking Summary</h3>
        <div className="space-y-4 text-sm">
          <div>
            <div className="text-muted-foreground mb-1">Service</div>
            <div className="font-medium">{serviceName ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Professional</div>
            <div className="font-medium">{staffName ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Date & Time</div>
            <div className="font-medium">
              {date ? format(date, "EEEE, MMMM do yyyy") : "—"}
              <br />
              {timeSlot ? `at ${timeSlot}` : ""}
            </div>
          </div>
          <div className="border-t border-border pt-4 mt-4 flex justify-between items-center">
            <div className="font-bold">Total</div>
            <div className="font-bold text-primary text-lg">KSh {priceKes ?? "—"}</div>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-900/20 rounded px-3 py-2">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            Pay at the studio on arrival
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
