"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Heart, Shield, Clock, Award, ChevronRight, ChevronLeft,
  CheckCircle2, Phone, CalendarDays, FlaskConical, Syringe,
  Baby, Scan, Pill, Stethoscope, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Icon map for DB-driven service cards ─────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Stethoscope, Heart, Syringe, Baby, FlaskConical, Scan, Pill, CalendarDays, Users, Phone,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeroSlide {
  badge: string; headline: string; accent: string; body: string;
  cta1Label: string; cta1Href: string; cta2Label: string; cta2Href: string;
  image: string; overlay: string;
}
interface Stat     { value: string; label: string; }
interface Service  { icon: string; title: string; description: string; color: string; }
interface Leader   { initials: string; name: string; title: string; qualifications: string; bio: string; bg: string; }
interface Doctor   { name: string; specialty: string; qualifications: string; experience: string; availability: string; bg: string; }

interface SiteContent {
  hospitalName?: string; tagline?: string;
  hero?: { slides: HeroSlide[] };
  stats?: Stat[]; services?: Service[]; whyUs?: string[];
  leadership?: Leader[]; doctors?: Doctor[];
  contact?: { phone: string; emergencyPhone: string; email: string; address: string; };
}
interface SiteTheme { primaryColor: string; borderRadius: string; fontFamily: string; }
export interface SiteSettings { content: SiteContent; theme: SiteTheme; }

// ─── Colour utility ───────────────────────────────────────────────────────────

function hexToHslStr(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return "222 47% 11%";
  let [rv, gv, bv] = [parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255];
  const max = Math.max(rv, gv, bv), min = Math.min(rv, gv, bv);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rv) h = ((gv - bv) / d + (gv < bv ? 6 : 0)) / 6;
    else if (max === gv) h = ((bv - rv) / d + 2) / 6;
    else h = ((rv - gv) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// ─── Defaults (same as what the service returns when DB has no record) ─────────

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    badge: "NHIS Accredited · ISO 9001 Certified", headline: "Your Health,", accent: "Our Priority",
    body: "CareSync General Hospital delivers world-class medical care with compassionate specialists, advanced diagnostics, and a patient-first approach — right here in Lagos.",
    cta1Label: "Book Appointment", cta1Href: "/contact", cta2Label: "Our Services", cta2Href: "/services",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1600&q=85&auto=format&fit=crop",
    overlay: "linear-gradient(105deg, rgba(15,23,64,0.82) 0%, rgba(30,58,138,0.65) 55%, rgba(30,58,138,0.30) 100%)",
  },
  {
    badge: "Cutting-Edge Diagnostics", headline: "Advanced Diagnostics", accent: "& Technology",
    body: "State-of-the-art CT, MRI, digital X-ray, and a fully equipped in-house laboratory delivering rapid, accurate results for better clinical decisions.",
    cta1Label: "Explore Services", cta1Href: "/services", cta2Label: "Book a Test", cta2Href: "/contact",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1600&q=85&auto=format&fit=crop",
    overlay: "linear-gradient(105deg, rgba(4,50,40,0.85) 0%, rgba(15,118,110,0.65) 55%, rgba(13,148,136,0.25) 100%)",
  },
  {
    badge: "120+ Medical Specialists", headline: "Expert Care,", accent: "Compassionate Hearts",
    body: "Our board-certified specialists span every major discipline — from surgery and paediatrics to cardiology and oncology — all committed to your recovery.",
    cta1Label: "Meet Our Doctors", cta1Href: "/doctors", cta2Label: "Book Consultation", cta2Href: "/contact",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=1600&q=85&auto=format&fit=crop",
    overlay: "linear-gradient(105deg, rgba(20,10,70,0.85) 0%, rgba(67,56,202,0.65) 55%, rgba(99,102,241,0.25) 100%)",
  },
  {
    badge: "Always Open — Always Ready", headline: "24/7 Emergency", accent: "Response",
    body: "Round-the-clock emergency and trauma care with a dedicated bay, resuscitation team, and ambulance service. Your emergency is our immediate priority.",
    cta1Label: "Emergency: 0800 000 0000", cta1Href: "tel:+2348000000000", cta2Label: "Learn More", cta2Href: "/services",
    image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1600&q=85&auto=format&fit=crop",
    overlay: "linear-gradient(105deg, rgba(60,5,5,0.88) 0%, rgba(185,28,28,0.68) 55%, rgba(239,68,68,0.25) 100%)",
  },
];

const DEFAULT_STATS: Stat[] = [
  { value: "15+", label: "Years of Excellence" }, { value: "50k+", label: "Patients Treated" },
  { value: "120+", label: "Medical Specialists" }, { value: "24/7", label: "Emergency Care" },
];

const DEFAULT_SERVICES: Service[] = [
  { icon: "Stethoscope", title: "Outpatient Clinic",   color: "text-blue-600 bg-blue-50",     description: "Walk-in consultations with general practitioners and specialists, same-day appointments available." },
  { icon: "Heart",       title: "Emergency & Trauma",  color: "text-red-600 bg-red-50",       description: "Round-the-clock emergency care with a dedicated trauma bay and resuscitation team." },
  { icon: "Syringe",     title: "Surgery",             color: "text-purple-600 bg-purple-50", description: "Elective and emergency surgical procedures across all major specialties with modern theatres." },
  { icon: "Baby",        title: "Pediatrics",          color: "text-pink-600 bg-pink-50",     description: "Dedicated children's ward with specialist paediatric doctors and child-friendly facilities." },
  { icon: "FlaskConical",title: "Laboratory",          color: "text-amber-600 bg-amber-50",   description: "Full in-house laboratory with rapid turnaround for blood, urine, microbiology and histology tests." },
  { icon: "Scan",        title: "Radiology",           color: "text-teal-600 bg-teal-50",     description: "Digital X-ray, ultrasound, CT scan, and MRI with same-day reporting for urgent cases." },
  { icon: "Pill",        title: "Pharmacy",            color: "text-green-600 bg-green-50",   description: "On-site pharmacy stocked with branded and generic drugs, open 24 hours for inpatients." },
  { icon: "CalendarDays",title: "Telemedicine",        color: "text-indigo-600 bg-indigo-50", description: "Video consultations from the comfort of your home. Book online and see a doctor in minutes." },
];

const DEFAULT_WHY_US: string[] = [
  "NHIS-accredited and all major HMOs accepted",
  "Internationally trained medical specialists",
  "Electronic health records — no lost files",
  "Transparent, itemised billing with no hidden charges",
  "Dedicated patient liaison and support team",
  "Modern, accredited diagnostic equipment",
];

const DEFAULT_LEADERSHIP: Leader[] = [
  { initials: "AO", name: "Prof. Adebayo Okafor",  title: "Chairman, Board of Directors",       qualifications: "MBBS, FMCP, PhD (Health Administration)", bio: "Professor Okafor brings over 30 years of healthcare governance experience, having led landmark health policy reforms in Nigeria.", bg: "linear-gradient(135deg,#1d4ed8,#1e3a8a)" },
  { initials: "EN", name: "Dr. Emeka Nwosu",        title: "Medical Director",                   qualifications: "MBBS, FRCS (Edin), MBA",                  bio: "A Fellow of the Royal College of Surgeons, Dr. Nwosu has steered CareSync's clinical operations for over a decade, driving quality outcomes and international accreditation standards.", bg: "linear-gradient(135deg,#0f766e,#134e4a)" },
  { initials: "FA", name: "Dr. Fatima Aliyu",       title: "Deputy Medical Director (Clinical)", qualifications: "MBBS, FWACP (Internal Medicine)",          bio: "Dr. Aliyu oversees all clinical departments, patient safety protocols, and clinical governance. Her leadership has been pivotal in achieving the hospital's ISO 9001 certification.", bg: "linear-gradient(135deg,#4338ca,#312e81)" },
  { initials: "TA", name: "Dr. Taiwo Adegbite",    title: "Head of Administration & Finance",   qualifications: "MBBS, MPH, ACCA",                         bio: "Dr. Adegbite manages the hospital's administrative and financial operations, ensuring service sustainability while continuously improving patient access and staff welfare.", bg: "linear-gradient(135deg,#7c3aed,#4c1d95)" },
];

const DEFAULT_DOCTORS: Doctor[] = [
  { name: "Dr. Chidi Adeyemi", specialty: "General Medicine", qualifications: "MBBS, FMCP",  experience: "12 years", availability: "Mon–Fri", bg: "linear-gradient(135deg,#2563eb,#1e3a8a)" },
  { name: "Dr. Amaka Osei",    specialty: "Paediatrics",      qualifications: "MBBS, FWACP", experience: "9 years",  availability: "Mon–Sat", bg: "linear-gradient(135deg,#ec4899,#be123c)" },
  { name: "Dr. Babatunde Eze", specialty: "Surgery",          qualifications: "MBBS, FWACS", experience: "15 years", availability: "Tue–Sat", bg: "linear-gradient(135deg,#0f766e,#134e4a)" },
];

const DEFAULT_THEME: SiteTheme = { primaryColor: "#1d4ed8", borderRadius: "0.5rem", fontFamily: "inter" };

// ─── Hero Slider ──────────────────────────────────────────────────────────────

function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((next: number) => {
    setFading(true);
    setTimeout(() => { setIdx(next); setFading(false); }, 250);
  }, []);

  const next = useCallback(() => goTo((idx + 1) % slides.length), [idx, goTo, slides.length]);
  const prev = useCallback(() => goTo((idx - 1 + slides.length) % slides.length), [idx, goTo, slides.length]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 7000);
    return () => clearInterval(t);
  }, [paused, next]);

  // Reset if slides change
  useEffect(() => { setIdx(0); }, [slides]);

  const slide = slides[idx] ?? slides[0];
  if (!slide) return null;

  return (
    <section
      className="relative min-h-[580px] overflow-hidden text-white lg:min-h-[640px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background images — stacked, crossfade */}
      {slides.map((s, i) => (
        <div key={i} aria-hidden className="absolute inset-0" style={{ transition: "opacity 0.8s ease-in-out", opacity: i === idx ? 1 : 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.image} alt="" className="h-full w-full object-cover object-center" loading={i === 0 ? "eager" : "lazy"} />
          <div className="absolute inset-0" style={{ background: s.overlay }} />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      ))}

      {/* Content */}
      <div
        className="relative z-10 flex min-h-[580px] flex-col items-center justify-center py-20 lg:min-h-[640px] lg:py-28"
        style={{ transition: "opacity 0.25s ease", opacity: fading ? 0 : 1 }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 border-white/30 bg-white/15 text-white backdrop-blur-sm hover:bg-white/25">
              {slide.badge}
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.55)" }}>
              {slide.headline}{" "}
              <span className="text-white/90">{slide.accent}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-white sm:text-xl" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.60)" }}>
              {slide.body}
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="border-0 bg-white font-semibold text-gray-900 shadow-lg hover:bg-white/95 hover:text-gray-900" asChild>
                <Link href={slide.cta1Href}>{slide.cta1Label}</Link>
              </Button>
              <Button size="lg" className="border border-white/60 bg-white/10 font-semibold text-white backdrop-blur-sm hover:bg-white/20 hover:text-white" asChild>
                <Link href={slide.cta2Href}>{slide.cta2Label} <ChevronRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <button onClick={prev} aria-label="Previous slide" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button key={i} onClick={() => goTo(i)} aria-label={`Slide ${i + 1}`} className="rounded-full transition-all duration-300"
                  style={{ width: i === idx ? 28 : 8, height: 8, background: i === idx ? "#fff" : "rgba(255,255,255,0.4)", boxShadow: i === idx ? "0 0 0 2px rgba(255,255,255,0.4)" : "none" }}
                />
              ))}
            </div>
            <button onClick={next} aria-label="Next slide" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PublicHomePage({ settings }: { settings?: SiteSettings | null }) {
  const c = settings?.content;
  const t = settings?.theme ?? DEFAULT_THEME;

  const slides     = c?.hero?.slides?.length     ? (c.hero.slides as HeroSlide[])   : DEFAULT_SLIDES;
  const stats      = c?.stats?.length            ? (c.stats      as Stat[])         : DEFAULT_STATS;
  const services   = c?.services?.length         ? (c.services   as Service[])      : DEFAULT_SERVICES;
  const whyUs      = c?.whyUs?.length            ? (c.whyUs      as string[])       : DEFAULT_WHY_US;
  const leadership = c?.leadership?.length       ? (c.leadership as Leader[])       : DEFAULT_LEADERSHIP;
  const doctors    = c?.doctors?.length          ? (c.doctors    as Doctor[])       : DEFAULT_DOCTORS;
  const contact    = c?.contact ?? { phone: "+234 1 000 0000", emergencyPhone: "0800 000 0000", email: "info@caresync.hospital", address: "123 Hospital Road, Lagos" };

  const themeVars = {
    "--primary":             hexToHslStr(t.primaryColor),
    "--primary-foreground":  "0 0% 98%",
    "--radius":              t.borderRadius,
  } as React.CSSProperties;

  return (
    <div style={themeVars}>
      <HeroSlider slides={slides} />

      {/* Stats bar */}
      <section className="border-b bg-white py-10 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <dt className="text-3xl font-bold text-primary">{value}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Services */}
      <section className="bg-white py-20 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <Badge variant="outline" className="mb-3">What We Offer</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Our Medical Services</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Comprehensive care across all major medical specialties under one roof.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map(({ icon, title, description, color }) => {
              const Icon = ICON_MAP[icon] ?? Stethoscope;
              return (
                <Card key={title} className="group cursor-pointer border bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:bg-gray-900">
                  <CardContent className="p-6">
                    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <Button variant="outline" asChild>
              <Link href="/services">View All Services <ChevronRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why CareSync */}
      <section className="bg-gray-50 py-20 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge variant="outline" className="mb-3">Why Choose Us</Badge>
              <h2 className="text-3xl font-bold sm:text-4xl">Why Patients Choose CareSync</h2>
              <p className="mt-4 text-muted-foreground">We combine decades of medical expertise with modern technology to deliver care that is safe, transparent, and centred on you.</p>
              <ul className="mt-8 space-y-3">
                {whyUs.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="mt-8" asChild><Link href="/about">Learn More About Us</Link></Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { Icon: Heart,  label: "Patient-Centred Care", iconClass: "bg-red-50   text-red-600" },
                { Icon: Shield, label: "Safe & Accredited",    iconClass: "bg-blue-50  text-blue-600" },
                { Icon: Clock,  label: "Always Available",     iconClass: "bg-amber-50 text-amber-600" },
                { Icon: Award,  label: "Award-Winning Team",   iconClass: "bg-green-50 text-green-600" },
              ].map(({ Icon, label, iconClass }) => (
                <div key={label} className="flex flex-col items-center rounded-2xl border bg-white p-6 text-center shadow-sm dark:bg-gray-800">
                  <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full ${iconClass}`}><Icon className="h-7 w-7" /></div>
                  <span className="text-sm font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="bg-white py-20 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <Badge variant="outline" className="mb-3">Our Leadership</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Board of Directors &amp; Medical Leadership</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Guided by experienced clinicians and administrators committed to delivering excellence in healthcare governance.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {leadership.map((person) => (
              <Card key={person.name} className="overflow-hidden border shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                <div className="flex flex-col items-center justify-center px-6 py-8" style={{ background: person.bg }}>
                  <div className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
                    style={{ background: "rgba(255,255,255,0.18)", boxShadow: "0 0 0 4px rgba(255,255,255,0.25)" }}>
                    {person.initials}
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-bold text-foreground">{person.name}</h3>
                  <p className="text-sm font-medium text-primary">{person.title}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{person.qualifications}</p>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{person.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Doctors */}
      <section className="bg-gray-50 py-20 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <Badge variant="outline" className="mb-3">Our Specialists</Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">Meet Our Specialists</h2>
            <p className="mt-3 text-muted-foreground">Highly qualified doctors dedicated to your wellbeing.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {doctors.map((doc) => (
              <Card key={doc.name} className="overflow-hidden border shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                <div className="flex h-36 items-center justify-center" style={{ background: doc.bg }}>
                  <div className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
                    style={{ background: "rgba(255,255,255,0.18)", boxShadow: "0 0 0 4px rgba(255,255,255,0.25)" }}>
                    {doc.name.split(" ").slice(1).map((n) => n[0]).join("")}
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-semibold">{doc.name}</h3>
                  <p className="text-sm text-primary">{doc.specialty}</p>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <p>{doc.qualifications} · {doc.experience} experience</p>
                    <p>Available: {doc.availability}</p>
                  </div>
                  <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                    <Link href="/contact">Book Consultation</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button variant="outline" asChild>
              <Link href="/doctors">See All Doctors <ChevronRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold">Ready to Book an Appointment?</h2>
          <p className="mt-3 text-primary-foreground/80">Call us or fill out the online form. Our team will confirm your slot within minutes.</p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90" asChild>
              <Link href="/contact">Book Online</Link>
            </Button>
            <Button size="lg" className="border border-white/50 bg-transparent text-white hover:bg-white/10" asChild>
              <a href={`tel:${contact.emergencyPhone.replace(/\s/g, "")}`}>
                <Phone className="mr-2 h-4 w-4" />{contact.emergencyPhone}
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
