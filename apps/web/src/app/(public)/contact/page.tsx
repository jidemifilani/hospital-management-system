import type { Metadata } from "next";
import { ContactPageClient } from "./contact-client";

export const metadata: Metadata = {
  title: "Contact & Book Appointment — CareSync General Hospital",
  description: "Book an appointment or contact CareSync General Hospital in Victoria Island, Lagos. Emergency line available 24/7.",
};

export default function ContactPage() {
  return <ContactPageClient />;
}
