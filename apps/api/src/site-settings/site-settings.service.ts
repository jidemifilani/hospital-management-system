import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_SITE_CONTENT = {
  hospitalName: "CareSync General Hospital",
  tagline: "Your Health, Our Priority",
  hero: {
    slides: [
      {
        badge: "NHIS Accredited · ISO 9001 Certified",
        headline: "Your Health,",
        accent: "Our Priority",
        body: "CareSync General Hospital delivers world-class medical care with compassionate specialists, advanced diagnostics, and a patient-first approach — right here in Lagos.",
        cta1Label: "Book Appointment",
        cta1Href: "/contact",
        cta2Label: "Our Services",
        cta2Href: "/services",
        image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1600&q=85&auto=format&fit=crop",
        overlay: "linear-gradient(105deg, rgba(15,23,64,0.82) 0%, rgba(30,58,138,0.65) 55%, rgba(30,58,138,0.30) 100%)",
      },
      {
        badge: "Cutting-Edge Diagnostics",
        headline: "Advanced Diagnostics",
        accent: "& Technology",
        body: "State-of-the-art CT, MRI, digital X-ray, and a fully equipped in-house laboratory delivering rapid, accurate results for better clinical decisions.",
        cta1Label: "Explore Services",
        cta1Href: "/services",
        cta2Label: "Book a Test",
        cta2Href: "/contact",
        image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1600&q=85&auto=format&fit=crop",
        overlay: "linear-gradient(105deg, rgba(4,50,40,0.85) 0%, rgba(15,118,110,0.65) 55%, rgba(13,148,136,0.25) 100%)",
      },
      {
        badge: "120+ Medical Specialists",
        headline: "Expert Care,",
        accent: "Compassionate Hearts",
        body: "Our board-certified specialists span every major discipline — from surgery and paediatrics to cardiology and oncology — all committed to your recovery.",
        cta1Label: "Meet Our Doctors",
        cta1Href: "/doctors",
        cta2Label: "Book Consultation",
        cta2Href: "/contact",
        image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=1600&q=85&auto=format&fit=crop",
        overlay: "linear-gradient(105deg, rgba(20,10,70,0.85) 0%, rgba(67,56,202,0.65) 55%, rgba(99,102,241,0.25) 100%)",
      },
      {
        badge: "Always Open — Always Ready",
        headline: "24/7 Emergency",
        accent: "Response",
        body: "Round-the-clock emergency and trauma care with a dedicated bay, resuscitation team, and ambulance service. Your emergency is our immediate priority.",
        cta1Label: "Emergency: 0800 000 0000",
        cta1Href: "tel:+2348000000000",
        cta2Label: "Learn More",
        cta2Href: "/services",
        image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1600&q=85&auto=format&fit=crop",
        overlay: "linear-gradient(105deg, rgba(60,5,5,0.88) 0%, rgba(185,28,28,0.68) 55%, rgba(239,68,68,0.25) 100%)",
      },
    ],
  },
  stats: [
    { value: "15+",  label: "Years of Excellence" },
    { value: "50k+", label: "Patients Treated" },
    { value: "120+", label: "Medical Specialists" },
    { value: "24/7", label: "Emergency Care" },
  ],
  services: [
    { icon: "Stethoscope", title: "Outpatient Clinic",   color: "text-blue-600 bg-blue-50",     description: "Walk-in consultations with general practitioners and specialists, same-day appointments available." },
    { icon: "Heart",       title: "Emergency & Trauma",  color: "text-red-600 bg-red-50",       description: "Round-the-clock emergency care with a dedicated trauma bay and resuscitation team." },
    { icon: "Syringe",     title: "Surgery",             color: "text-purple-600 bg-purple-50", description: "Elective and emergency surgical procedures across all major specialties with modern theatres." },
    { icon: "Baby",        title: "Pediatrics",          color: "text-pink-600 bg-pink-50",     description: "Dedicated children's ward with specialist paediatric doctors and child-friendly facilities." },
    { icon: "FlaskConical",title: "Laboratory",          color: "text-amber-600 bg-amber-50",   description: "Full in-house laboratory with rapid turnaround for blood, urine, microbiology and histology tests." },
    { icon: "Scan",        title: "Radiology",           color: "text-teal-600 bg-teal-50",     description: "Digital X-ray, ultrasound, CT scan, and MRI with same-day reporting for urgent cases." },
    { icon: "Pill",        title: "Pharmacy",            color: "text-green-600 bg-green-50",   description: "On-site pharmacy stocked with branded and generic drugs, open 24 hours for inpatients." },
    { icon: "CalendarDays",title: "Telemedicine",        color: "text-indigo-600 bg-indigo-50", description: "Video consultations from the comfort of your home. Book online and see a doctor in minutes." },
  ],
  whyUs: [
    "NHIS-accredited and all major HMOs accepted",
    "Internationally trained medical specialists",
    "Electronic health records — no lost files",
    "Transparent, itemised billing with no hidden charges",
    "Dedicated patient liaison and support team",
    "Modern, accredited diagnostic equipment",
  ],
  leadership: [
    { initials: "AO", name: "Prof. Adebayo Okafor",  title: "Chairman, Board of Directors",       qualifications: "MBBS, FMCP, PhD (Health Administration)", bio: "Professor Okafor brings over 30 years of healthcare governance experience, having led landmark health policy reforms in Nigeria. He chairs the hospital's strategic oversight committee.", bg: "linear-gradient(135deg,#1d4ed8,#1e3a8a)" },
    { initials: "EN", name: "Dr. Emeka Nwosu",        title: "Medical Director",                   qualifications: "MBBS, FRCS (Edin), MBA",                  bio: "A Fellow of the Royal College of Surgeons, Dr. Nwosu has steered CareSync's clinical operations for over a decade, driving quality outcomes and international accreditation standards.", bg: "linear-gradient(135deg,#0f766e,#134e4a)" },
    { initials: "FA", name: "Dr. Fatima Aliyu",       title: "Deputy Medical Director (Clinical)", qualifications: "MBBS, FWACP (Internal Medicine)",          bio: "Dr. Aliyu oversees all clinical departments, patient safety protocols, and clinical governance. Her leadership has been pivotal in achieving the hospital's ISO 9001 certification.", bg: "linear-gradient(135deg,#4338ca,#312e81)" },
    { initials: "TA", name: "Dr. Taiwo Adegbite",    title: "Head of Administration & Finance",   qualifications: "MBBS, MPH, ACCA",                         bio: "Dr. Adegbite manages the hospital's administrative and financial operations, ensuring service sustainability while continuously improving patient access and staff welfare.", bg: "linear-gradient(135deg,#7c3aed,#4c1d95)" },
  ],
  doctors: [
    { name: "Dr. Chidi Adeyemi", specialty: "General Medicine", qualifications: "MBBS, FMCP",  experience: "12 years", availability: "Mon–Fri", bg: "linear-gradient(135deg,#2563eb,#1e3a8a)" },
    { name: "Dr. Amaka Osei",    specialty: "Paediatrics",      qualifications: "MBBS, FWACP", experience: "9 years",  availability: "Mon–Sat", bg: "linear-gradient(135deg,#ec4899,#be123c)" },
    { name: "Dr. Babatunde Eze", specialty: "Surgery",          qualifications: "MBBS, FWACS", experience: "15 years", availability: "Tue–Sat", bg: "linear-gradient(135deg,#0f766e,#134e4a)" },
  ],
  contact: {
    phone: "+234 1 000 0000",
    emergencyPhone: "0800 000 0000",
    email: "info@caresync.hospital",
    address: "123 Hospital Road, Lagos, Nigeria",
  },
};

export const DEFAULT_SITE_THEME = {
  primaryColor: "#1d4ed8",
  borderRadius: "0.5rem",
  fontFamily: "inter",
};

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class SiteSettingsService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const org = await this.prisma.organization.findFirst({
      select: { siteContent: true, siteTheme: true, name: true },
    });
    return {
      content: (org?.siteContent as object) ?? DEFAULT_SITE_CONTENT,
      theme:   (org?.siteTheme   as object) ?? DEFAULT_SITE_THEME,
    };
  }

  async updateContent(organizationId: string, patch: Record<string, unknown>) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { siteContent: true },
    });
    const existing = (org?.siteContent as Record<string, unknown>) ?? {};
    const merged   = { ...DEFAULT_SITE_CONTENT, ...existing, ...patch };
    return this.prisma.organization.update({
      where:  { id: organizationId },
      data:   { siteContent: merged },
      select: { siteContent: true },
    });
  }

  async updateTheme(organizationId: string, theme: Record<string, unknown>) {
    return this.prisma.organization.update({
      where:  { id: organizationId },
      data:   { siteTheme: theme },
      select: { siteTheme: true },
    });
  }
}
