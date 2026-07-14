import type { Metadata } from "next";
import Link from "next/link";
import { Stethoscope, Heart, Syringe, Baby, FlaskConical, Scan, Pill, CalendarDays, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Services — CareSync General Hospital",
  description: "Explore our full range of hospital services including outpatient, emergency, surgery, pediatrics, lab, radiology, pharmacy and telemedicine.",
};

const departments = [
  {
    icon: Stethoscope,
    name: "Outpatient Clinic",
    code: "OPD",
    description: "Our outpatient department offers scheduled and walk-in consultations with general practitioners and specialists. Services include health checks, chronic disease management, pre-employment medicals, and follow-up care.",
    features: ["General consultations", "Specialist referrals", "Chronic disease management", "Pre-employment medicals", "Travel health advice"],
    availability: "Monday – Friday, 8am – 6pm  |  Saturday, 9am – 2pm",
  },
  {
    icon: Heart,
    name: "Emergency & Trauma",
    code: "EMG",
    description: "Our emergency department is staffed 24/7 with experienced emergency physicians, nurses and paramedics. We manage medical emergencies, trauma, obstetric emergencies and paediatric emergencies.",
    features: ["24/7 emergency coverage", "Trauma resuscitation bay", "Rapid triage system", "Emergency surgery support", "Critical care step-down"],
    availability: "24 hours, 7 days a week",
  },
  {
    icon: Syringe,
    name: "Surgery",
    code: "SRG",
    description: "Our surgical suite is equipped with modern laparoscopic and open surgery facilities. We perform elective and emergency procedures across general surgery, orthopaedics, ENT, ophthalmology and obstetrics.",
    features: ["Laparoscopic (keyhole) surgery", "General and abdominal surgery", "Orthopaedic procedures", "ENT surgery", "Day-case surgery"],
    availability: "Elective: Mon–Fri | Emergency: 24/7",
  },
  {
    icon: Baby,
    name: "Pediatrics",
    code: "PED",
    description: "Our dedicated children's ward provides inpatient and outpatient care for children from newborn to 16 years. Services include well-baby checks, immunisations, treatment of common childhood illnesses and paediatric emergencies.",
    features: ["Neonatal care", "Immunisation clinic", "Well-baby checks", "Paediatric emergency care", "Child-friendly inpatient ward"],
    availability: "Outpatient: Mon–Sat | Inpatient: 24/7",
  },
  {
    icon: FlaskConical,
    name: "Laboratory",
    code: "LAB",
    description: "Our fully accredited in-house laboratory offers a comprehensive range of diagnostic tests. Results for most routine tests are available within 4 hours; STAT results in 1 hour.",
    features: ["Full blood count & biochemistry", "Microbiology & culture", "Histopathology & biopsy", "Hormonal & fertility panels", "HL7 integration with electronic records"],
    availability: "Monday – Saturday, 7am – 8pm  |  Sunday, 8am – 4pm",
  },
  {
    icon: Scan,
    name: "Radiology",
    code: "RAD",
    description: "Our radiology department provides advanced digital imaging including X-ray, ultrasound, CT scan and MRI. All studies are reported by consultant radiologists, with urgent same-day reporting available.",
    features: ["Digital X-ray", "Ultrasound (including obstetric)", "CT scan", "MRI", "DICOM records accessible to your doctor"],
    availability: "Mon–Fri: 7am–7pm  |  Sat: 8am–4pm  |  Emergency: 24/7",
  },
  {
    icon: Pill,
    name: "Pharmacy",
    code: "PHR",
    description: "Our on-site pharmacy is stocked with a wide range of branded and generic medications. Our pharmacists counsel patients on drug usage, interactions and storage.",
    features: ["Branded and generic drugs", "Discharge medication counselling", "Drug interaction checking", "24/7 for inpatients", "Online refills for regular medications"],
    availability: "Outpatient: 8am – 8pm daily  |  Inpatient: 24/7",
  },
  {
    icon: CalendarDays,
    name: "Telemedicine",
    code: "TEL",
    description: "Consult a doctor from anywhere in Nigeria via secure video call. Book online, complete a health questionnaire, and join your appointment from your phone or computer.",
    features: ["Video consultations", "E-prescriptions sent to your pharmacy", "Chronic disease follow-up", "Mental health support", "Second opinion service"],
    availability: "7 days a week, 7am – 10pm",
  },
];

export default function ServicesPage() {
  return (
    <>
      <section className="bg-gradient-to-r from-primary to-blue-700 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">Our Services</h1>
          <p className="mt-3 max-w-2xl text-blue-100">
            Comprehensive medical care across eight specialist departments — all under one roof.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {departments.map(({ icon: Icon, name, code, description, features, availability }) => (
              <Card key={code} className="overflow-hidden border-0 shadow-sm">
                <CardHeader className="border-b bg-gray-50 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{name}</CardTitle>
                      <p className="text-xs font-mono text-muted-foreground">{code}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-6 p-6 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">{description}</p>
                    <ul className="mt-4 grid grid-cols-2 gap-2">
                      {features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-xl bg-blue-50 p-4 text-sm">
                      <p className="font-medium text-primary">Hours</p>
                      <p className="mt-1 text-muted-foreground">{availability}</p>
                    </div>
                    <Button className="w-full" asChild>
                      <Link href="/contact">
                        Book Now <ChevronRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
