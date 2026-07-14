import type { Metadata } from "next";
import { CreateInvoicePage } from "@/components/billing/create-invoice-page";

export const metadata: Metadata = { title: "New Invoice — CareSync HMS" };

export default function NewInvoiceRoute() {
  return <CreateInvoicePage />;
}
