import { useState } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { 
  useListServices, 
  useListStaff, 
  useGetStaffAvailability, 
  useCreateAppointment,
  useCreateCustomer
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Scissors, User, Calendar as CalendarIcon, Clock, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

export default function BookPage() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  
  // Booking State
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState({ name: "", phone: "", email: "", notes: "" });

  const { data: services, isLoading: loadingServices } = useListServices();
  const { data: staff, isLoading: loadingStaff } = useListStaff();
  
  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const { data: availability, isLoading: loadingAvailability } = useGetStaffAvailability(
    { staffId: selectedStaffId!, date: formattedDate },
    { query: { enabled: !!selectedStaffId && !!selectedDate } }
  );

  const createCustomer = useCreateCustomer();
  const createAppointment = useCreateAppointment();

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

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

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId || !selectedStaffId || !selectedDate || !selectedTimeSlot) return;

    try {
      // 1. Create/Get customer (In a real app we might search first, but here we just create)
      const customer = await createCustomer.mutateAsync({
        data: {
          name: customerData.name,
          phone: customerData.phone,
          email: customerData.email,
        }
      });

      // 2. Create appointment
      await createAppointment.mutateAsync({
        data: {
          customerId: customer.id,
          serviceId: selectedServiceId,
          staffId: selectedStaffId,
          date: formattedDate,
          timeSlot: selectedTimeSlot,
          notes: customerData.notes
        }
      });

      setStep(6); // Confirmation
    } catch (error) {
      console.error("Failed to book appointment", error);
      alert("Failed to book appointment. Please try again.");
    }
  };

  const getServiceName = () => services?.find(s => s.id === selectedServiceId)?.name;
  const getStaffName = () => staff?.find(s => s.id === selectedStaffId)?.name;
  const getServicePrice = () => services?.find(s => s.id === selectedServiceId)?.priceKes.toLocaleString();

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">Book an Appointment</h1>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className={step >= 1 ? "text-primary font-bold" : ""}>Service</span>
          <ChevronRight className="w-4 h-4" />
          <span className={step >= 2 ? "text-primary font-bold" : ""}>Professional</span>
          <ChevronRight className="w-4 h-4" />
          <span className={step >= 3 ? "text-primary font-bold" : ""}>Date & Time</span>
          <ChevronRight className="w-4 h-4" />
          <span className={step >= 5 ? "text-primary font-bold" : ""}>Details</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm min-h-[500px]">
        {/* STEP 1: Select Service */}
        {step === 1 && (
          <div className="p-6 md:p-8 animate-in fade-in">
            <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
              <Scissors className="text-primary w-6 h-6" /> Select Service
            </h2>
            
            {loadingServices ? (
              <div className="text-center py-12">Loading services...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services?.filter(s => s.isActive).map(service => (
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
                      <div className="text-primary font-medium">KSh {service.priceKes.toLocaleString()}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{service.durationMinutes} mins</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Select Staff */}
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
                {staff?.filter(s => s.isActive).map(member => (
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
                      <img src={member.photoUrl || `/team-1.png`} alt={member.name} className="w-full h-full object-cover" />
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

        {/* STEP 3 & 4: Date & Time */}
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
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
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
                    {availability.slots.map(slot => (
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

        {/* STEP 5: Details */}
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
                <form onSubmit={handleBook} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input 
                      id="name" 
                      required 
                      value={customerData.name} 
                      onChange={e => setCustomerData({...customerData, name: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input 
                        id="phone" 
                        required 
                        value={customerData.phone} 
                        onChange={e => setCustomerData({...customerData, phone: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={customerData.email} 
                        onChange={e => setCustomerData({...customerData, email: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Special Requests / Notes</Label>
                    <Textarea 
                      id="notes" 
                      value={customerData.notes} 
                      onChange={e => setCustomerData({...customerData, notes: e.target.value})}
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
                      {createAppointment.isPending ? "Confirming..." : "Confirm Booking"}
                    </Button>
                  </div>
                </form>
              </div>
              
              <div className="md:col-span-2">
                <Card className="bg-background/50">
                  <CardContent className="p-6">
                    <h3 className="font-bold border-b border-border pb-4 mb-4">Booking Summary</h3>
                    
                    <div className="space-y-4 text-sm">
                      <div>
                        <div className="text-muted-foreground mb-1">Service</div>
                        <div className="font-medium">{getServiceName()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Professional</div>
                        <div className="font-medium">{getStaffName()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Date & Time</div>
                        <div className="font-medium">
                          {selectedDate ? format(selectedDate, "EEEE, MMMM do yyyy") : ""} <br/>
                          at {selectedTimeSlot}
                        </div>
                      </div>
                      <div className="border-t border-border pt-4 mt-4 flex justify-between items-center">
                        <div className="font-bold">Total</div>
                        <div className="font-bold text-primary text-lg">KSh {getServicePrice()}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Confirmation */}
        {step === 5 && (
          <div className="p-12 text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-serif font-bold mb-4">Booking Confirmed</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8 text-lg">
              Thank you, {customerData.name}. Your appointment for {getServiceName()} with {getStaffName()} on {selectedDate ? format(selectedDate, "MMM do") : ""} at {selectedTimeSlot} has been confirmed.
            </p>
            
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