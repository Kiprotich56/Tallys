import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import {
  useListServices,
  useListStaff,
  useGetStaffAvailability,
  useCreateAppointment,
  useCreateCustomer,
  useInitiateMpesaPayment,
  useGetMpesaPaymentStatus,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Scissors,
  User,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

// Steps: 1=Service, 2=Staff, 3=DateTime, 4=Details, 5=Payment, 6=Confirm
export default function BookPage() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();

  // Booking state
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState({ name: "", phone: "", email: "", notes: "" });
  const [createdAppointmentId, setCreatedAppointmentId] = useState<number | null>(null);

  // M-Pesa state
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<"idle" | "waiting" | "success" | "failed">("idle");
  const [paymentError, setPaymentError] = useState("");
  const [isSimulated, setIsSimulated] = useState(false);

  const { data: services, isLoading: loadingServices } = useListServices();
  const { data: staff, isLoading: loadingStaff } = useListStaff();

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const { data: availability, isLoading: loadingAvailability } = useGetStaffAvailability(
    { staffId: selectedStaffId!, date: formattedDate },
    { query: { enabled: !!selectedStaffId && !!selectedDate } }
  );

  const createCustomer = useCreateCustomer();
  const createAppointment = useCreateAppointment();
  const initiateMpesa = useInitiateMpesaPayment();

  // Polling for payment status — only active while waiting
  const { data: paymentStatus } = useGetMpesaPaymentStatus(
    { checkoutRequestId: checkoutRequestId! },
    {
      query: {
        enabled: !!checkoutRequestId && paymentState === "waiting",
        refetchInterval: 3000,
        refetchIntervalInBackground: false,
      },
    }
  );

  // React to polled payment status
  useEffect(() => {
    if (!paymentStatus) return;
    if (paymentStatus.status === "success") {
      setPaymentState("success");
      setTimeout(() => setStep(6), 800);
    } else if (paymentStatus.status === "failed") {
      setPaymentState("failed");
      setPaymentError(paymentStatus.resultDesc ?? "Payment was declined or cancelled. Please try again.");
    }
  }, [paymentStatus]);

  // Sync M-Pesa phone from customer phone field
  useEffect(() => {
    if (customerData.phone && !mpesaPhone) {
      setMpesaPhone(customerData.phone);
    }
  }, [customerData.phone]);

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
    setSelectedDate(date);
    setSelectedTimeSlot(null);
  };

  const handleTimeSlotSelect = (slot: string) => {
    setSelectedTimeSlot(slot);
    handleNext();
  };

  // Step 4 → 5: create customer + appointment, then show payment
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId || !selectedStaffId || !selectedDate || !selectedTimeSlot) return;
    try {
      const customer = await createCustomer.mutateAsync({
        data: {
          name: customerData.name,
          phone: customerData.phone,
          email: customerData.email,
        },
      });

      const appointment = await createAppointment.mutateAsync({
        data: {
          customerId: customer.id,
          serviceId: selectedServiceId,
          staffId: selectedStaffId,
          date: formattedDate,
          timeSlot: selectedTimeSlot,
          notes: customerData.notes,
        },
      });

      setCreatedAppointmentId(appointment.id);
      setMpesaPhone(customerData.phone);
      setStep(5);
    } catch {
      alert("Failed to reserve your slot. Please try again.");
    }
  };

  // Step 5: initiate M-Pesa STK Push
  const handleMpesaPay = async () => {
    const selectedService = services?.find((s) => s.id === selectedServiceId);
    if (!selectedService) return;

    setPaymentState("waiting");
    setPaymentError("");
    setCheckoutRequestId(null);

    try {
      const res = await initiateMpesa.mutateAsync({
        data: {
          phone: mpesaPhone,
          amountKes: selectedService.priceKes,
          accountRef: `TALLYS${createdAppointmentId ?? ""}`,
          description: `Tally's - ${selectedService.name.slice(0, 13)}`,
        },
      });
      setCheckoutRequestId(res.checkoutRequestId);
      setIsSimulated(res.simulated ?? false);
    } catch {
      setPaymentState("failed");
      setPaymentError("Could not reach M-Pesa. Please check your phone number and try again.");
    }
  };

  const handleSkipPayment = () => setStep(6);

  const handleRetryPayment = () => {
    setPaymentState("idle");
    setCheckoutRequestId(null);
    setPaymentError("");
  };

  const getServiceName = () => services?.find((s) => s.id === selectedServiceId)?.name;
  const getStaffName = () => staff?.find((s) => s.id === selectedStaffId)?.name;
  const getServicePrice = () =>
    services?.find((s) => s.id === selectedServiceId)?.priceKes.toLocaleString();

  const stepLabels = ["Service", "Professional", "Date & Time", "Your Details", "Payment"];

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
                    <button
                      key={service.id}
                      onClick={() => handleServiceSelect(service.id)}
                      className={`text-left p-4 rounded-lg border transition-all ${
                        selectedServiceId === service.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50 bg-background"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold">{service.name}</div>
                        <div className="text-primary font-medium">
                          KSh {service.priceKes.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">{service.durationMinutes} mins</div>
                    </button>
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
                    <div>
                      <Label htmlFor="email">Email (optional)</Label>
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
                        "Continue to Payment →"
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

        {/* ── STEP 5: M-Pesa Payment ── */}
        {step === 5 && (
          <div className="p-6 md:p-8 animate-in fade-in">
            <div className="flex items-center mb-6">
              {paymentState === "idle" && (
                <Button variant="ghost" size="icon" onClick={handlePrev} className="mr-2">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
                <Smartphone className="text-primary w-6 h-6" /> Pay via M-Pesa
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              <div className="md:col-span-3">
                {/* Idle — show form */}
                {paymentState === "idle" && (
                  <div className="space-y-6">
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        Enter your M-Pesa phone number below. You'll receive an STK Push prompt on
                        your phone to authorise the payment of{" "}
                        <span className="text-primary font-bold">KSh {getServicePrice()}</span>.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="mpesa-phone">M-Pesa Phone Number *</Label>
                      <Input
                        id="mpesa-phone"
                        required
                        placeholder="0712 345 678"
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                        className="mt-1 text-lg tracking-wide"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Safaricom M-Pesa number (07XX or 01XX)
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <Button
                        className="w-full h-12 text-lg font-bold"
                        onClick={handleMpesaPay}
                        disabled={!mpesaPhone.trim()}
                      >
                        <Smartphone className="w-5 h-5 mr-2" />
                        Pay KSh {getServicePrice()} via M-Pesa
                      </Button>
                      <button
                        type="button"
                        onClick={handleSkipPayment}
                        className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors text-center"
                      >
                        Pay at the studio instead
                      </button>
                    </div>
                  </div>
                )}

                {/* Waiting — spinner */}
                {paymentState === "waiting" && (
                  <div className="flex flex-col items-center justify-center py-12 text-center gap-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <Smartphone className="w-10 h-10 text-primary" />
                      </div>
                      <Loader2 className="w-8 h-8 text-primary animate-spin absolute -top-1 -right-1" />
                    </div>
                    <div>
                      <p className="text-lg font-bold mb-2">M-Pesa prompt sent!</p>
                      <p className="text-muted-foreground text-sm max-w-xs">
                        {isSimulated
                          ? "Demo mode — simulating payment approval in a few seconds..."
                          : `Check your phone (${mpesaPhone}) and enter your M-Pesa PIN to complete payment.`}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Waiting for confirmation...
                    </div>
                  </div>
                )}

                {/* Success */}
                {paymentState === "success" && (
                  <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <p className="text-lg font-bold text-green-500">Payment Successful!</p>
                    <p className="text-muted-foreground text-sm">Redirecting to your confirmation...</p>
                  </div>
                )}

                {/* Failed */}
                {paymentState === "failed" && (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center py-8 text-center gap-4">
                      <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-destructive" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-destructive mb-1">Payment Failed</p>
                        <p className="text-muted-foreground text-sm max-w-xs">{paymentError}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleRetryPayment}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                      </Button>
                      <button
                        type="button"
                        onClick={handleSkipPayment}
                        className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors text-center"
                      >
                        Skip — pay at the studio
                      </button>
                    </div>
                  </div>
                )}
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

        {/* ── STEP 6: Confirmation ── */}
        {step === 6 && (
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
            {paymentState === "success" && (
              <p className="text-green-500 text-sm mb-6 font-medium">
                ✓ M-Pesa payment of KSh {getServicePrice()} received
              </p>
            )}
            {paymentState !== "success" && (
              <p className="text-muted-foreground text-sm mb-6">
                Please complete payment of{" "}
                <span className="text-primary font-semibold">KSh {getServicePrice()}</span> at the studio.
              </p>
            )}
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
        </div>
      </CardContent>
    </Card>
  );
}
