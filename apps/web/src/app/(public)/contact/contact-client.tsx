"use client";

import { useState } from "react";
import { MapPin, Phone, Mail, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DEPARTMENTS = [
  "Outpatient Clinic",
  "Emergency & Trauma",
  "Surgery",
  "Pediatrics",
  "Laboratory",
  "Radiology",
  "Pharmacy",
  "Telemedicine",
  "General Enquiry",
];

const TIME_SLOTS = [
  "8:00am", "9:00am", "10:00am", "11:00am",
  "12:00pm", "2:00pm", "3:00pm", "4:00pm",
];

export function ContactPageClient() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // TODO Phase 2: POST to /api/v1/appointments/public
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1000);
  }

  return (
    <>
      <section className="bg-gradient-to-r from-primary to-blue-700 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">Contact Us</h1>
          <p className="mt-3 max-w-2xl text-blue-100">
            Book an appointment, make an enquiry, or find your way to us. We&apos;re here to help.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-3">
            {/* Info sidebar */}
            <div className="space-y-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Hospital Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>1 Hospital Road, Victoria Island, Lagos, Nigeria</span>
                  </div>
                  <div className="flex gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-primary" />
                    <a href="tel:+2348000000000" className="hover:text-foreground">+234 800 000 0000</a>
                  </div>
                  <div className="flex gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-primary" />
                    <a href="mailto:info@caresync.ng" className="hover:text-foreground">info@caresync.ng</a>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Opening Hours</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {[
                    { days: "Monday – Friday", hours: "8:00am – 6:00pm" },
                    { days: "Saturday", hours: "9:00am – 2:00pm" },
                    { days: "Sunday", hours: "Emergencies only" },
                  ].map(({ days, hours }) => (
                    <div key={days} className="flex justify-between">
                      <span className="text-muted-foreground">{days}</span>
                      <span className="font-medium">{hours}</span>
                    </div>
                  ))}
                  <div className="mt-3 rounded-lg bg-red-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-semibold text-red-700">Emergency: 24/7</span>
                    </div>
                    <a
                      href="tel:+2348000000000"
                      className="mt-1 block text-sm font-bold text-red-700 hover:underline"
                    >
                      Call 0800 000 0000
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Booking form */}
            <div className="lg:col-span-2">
              {submitted ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border bg-green-50 px-8 py-16 text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                  <h2 className="mt-4 text-xl font-bold">Request Received!</h2>
                  <p className="mt-2 text-muted-foreground">
                    Thank you. Our team will contact you within 30 minutes to confirm your appointment.
                  </p>
                  <Button className="mt-6" onClick={() => setSubmitted(false)}>
                    Book Another Appointment
                  </Button>
                </div>
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Book an Appointment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="firstName">First name</Label>
                          <Input id="firstName" placeholder="Ada" required />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="lastName">Last name</Label>
                          <Input id="lastName" placeholder="Okafor" required />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="phone">Phone number</Label>
                          <Input id="phone" type="tel" placeholder="+234 800 000 0000" required />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="email">Email (optional)</Label>
                          <Input id="email" type="email" placeholder="ada@example.com" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Department / Service</Label>
                        <Select required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a department" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEPARTMENTS.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="date">Preferred date</Label>
                          <Input
                            id="date"
                            type="date"
                            required
                            min={new Date().toISOString().split("T")[0]}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Preferred time</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose time" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="message">Describe your concern (optional)</Label>
                        <Textarea
                          id="message"
                          placeholder="Briefly describe your symptoms or reason for visit…"
                          rows={4}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Submitting…" : "Request Appointment"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
