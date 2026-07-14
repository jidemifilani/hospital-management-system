import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Our Doctors — CareSync General Hospital",
  description: "Meet our team of experienced, internationally trained medical specialists at CareSync General Hospital, Lagos.",
};

const doctors = [
  { name: "Dr. Chidi Adeyemi", specialty: "General Medicine", dept: "Outpatient", quals: "MBBS (Lagos), FMCP", experience: "12 years", languages: ["English", "Igbo"], availability: "Mon – Fri" },
  { name: "Dr. Amaka Osei", specialty: "Paediatrics & Neonatology", dept: "Pediatrics", quals: "MBBS (Ibadan), FWACP", experience: "9 years", languages: ["English", "Yoruba"], availability: "Mon – Sat" },
  { name: "Dr. Babatunde Eze", specialty: "General & Laparoscopic Surgery", dept: "Surgery", quals: "MBBS (Lagos), FWACS", experience: "15 years", languages: ["English", "Yoruba"], availability: "Tue – Sat" },
  { name: "Dr. Ngozi Okafor", specialty: "Emergency Medicine", dept: "Emergency", quals: "MBBS (ABU), FEM", experience: "8 years", languages: ["English", "Igbo"], availability: "Rotating shifts" },
  { name: "Dr. Emeka Nwachukwu", specialty: "Radiology & Imaging", dept: "Radiology", quals: "MBBS (UI), FMCR", experience: "11 years", languages: ["English"], availability: "Mon – Fri" },
  { name: "Dr. Funmi Adesanya", specialty: "Obstetrics & Gynaecology", dept: "Outpatient", quals: "MBBS (Lagos), FWACOG", experience: "14 years", languages: ["English", "Yoruba"], availability: "Mon – Sat" },
  { name: "Dr. Tunde Balogun", specialty: "Internal Medicine & Cardiology", dept: "Outpatient", quals: "MBBS (Ibadan), FMCP, FESC", experience: "18 years", languages: ["English", "Yoruba"], availability: "Mon – Fri" },
  { name: "Dr. Chioma Egwu", specialty: "Family Medicine", dept: "Outpatient", quals: "MBBS (Lagos), FMCGP", experience: "6 years", languages: ["English", "Igbo"], availability: "Mon – Sat" },
];

export default function DoctorsPage() {
  return (
    <>
      <section className="bg-gradient-to-r from-primary to-blue-700 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">Our Medical Team</h1>
          <p className="mt-3 max-w-2xl text-blue-100">
            Internationally trained specialists committed to delivering the highest standard of care.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {doctors.map((doc) => {
              const initials = doc.name.split(" ").slice(1).map((n) => n[0]).join("");
              return (
                <Card key={doc.name} className="overflow-hidden border-0 shadow-sm">
                  <div className="flex h-28 items-center justify-center bg-gradient-to-br from-primary/10 to-blue-50">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-xl font-bold text-primary">
                      {initials}
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-semibold">{doc.name}</h3>
                    <p className="text-sm text-primary">{doc.specialty}</p>
                    <Badge variant="secondary" className="mt-2 text-xs">{doc.dept}</Badge>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <p>{doc.quals}</p>
                      <p>{doc.experience} experience</p>
                      <p>Speaks: {doc.languages.join(", ")}</p>
                      <p>Available: {doc.availability}</p>
                    </div>
                    <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                      <Link href="/contact">Book Appointment</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
