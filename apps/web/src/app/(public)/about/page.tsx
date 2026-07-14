import type { Metadata } from "next";
import { CheckCircle2, Users, Award, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us — CareSync General Hospital",
  description: "Learn about CareSync General Hospital's mission, values, and 15 years of healthcare excellence in Lagos.",
};

const milestones = [
  { year: "2010", event: "Founded as a 20-bed specialist clinic in Victoria Island" },
  { year: "2014", event: "Expanded to 80-bed full-service hospital with surgical theatre" },
  { year: "2017", event: "Achieved NHIS accreditation and ISO 9001 certification" },
  { year: "2019", event: "Launched telemedicine service and electronic health records" },
  { year: "2022", event: "Opened dedicated paediatrics and maternity wing" },
  { year: "2024", event: "Commissioned CT scanner and advanced radiology suite" },
];

const values = [
  { icon: Heart, title: "Compassion", description: "We treat every patient with empathy, dignity, and respect — because healing is as much emotional as it is clinical." },
  { icon: Award, title: "Excellence", description: "Our clinical protocols, equipment, and continuing education are benchmarked against international best practice." },
  { icon: CheckCircle2, title: "Integrity", description: "Transparent billing, honest prognoses, and straightforward communication build the trust that defines CareSync." },
  { icon: Users, title: "Community", description: "We invest in health education and outreach programmes for the communities we serve across Lagos." },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-r from-primary to-blue-700 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">About CareSync Hospital</h1>
          <p className="mt-3 max-w-2xl text-blue-100">
            Fifteen years of delivering world-class healthcare to patients and families across Lagos and beyond.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold">Our Mission</h2>
              <p className="mt-4 text-muted-foreground">
                To provide accessible, high-quality, compassionate healthcare that improves the health and wellbeing
                of every patient we serve — regardless of their background or circumstances.
              </p>
              <h2 className="mt-8 text-2xl font-bold">Our Vision</h2>
              <p className="mt-4 text-muted-foreground">
                To be Nigeria&apos;s most trusted hospital system — recognised for clinical excellence, patient safety,
                and innovation in healthcare delivery.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-blue-50 p-6 text-center">
                <p className="text-4xl font-bold text-primary">120+</p>
                <p className="mt-1 text-sm text-muted-foreground">Medical Staff</p>
              </div>
              <div className="rounded-2xl bg-green-50 p-6 text-center">
                <p className="text-4xl font-bold text-green-600">50k+</p>
                <p className="mt-1 text-sm text-muted-foreground">Patients Served</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-6 text-center">
                <p className="text-4xl font-bold text-amber-600">8</p>
                <p className="mt-1 text-sm text-muted-foreground">Departments</p>
              </div>
              <div className="rounded-2xl bg-purple-50 p-6 text-center">
                <p className="text-4xl font-bold text-purple-600">15+</p>
                <p className="mt-1 text-sm text-muted-foreground">Years of Care</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-10 text-center text-2xl font-bold">Our Core Values</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-10 text-center text-2xl font-bold">Our Journey</h2>
          <div className="space-y-6">
            {milestones.map(({ year, event }) => (
              <div key={year} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {year.slice(2)}
                  </div>
                  <div className="mt-1 flex-1 w-px bg-border" />
                </div>
                <div className="pb-6">
                  <p className="font-semibold text-primary">{year}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
