"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export default function PaymentCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const ref = params.get("ref");
  const invoice = params.get("invoice");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!ref || !invoice) {
      setStatus("error");
      setMessage("Invalid callback parameters.");
      return;
    }
    // The webhook handles the actual payment recording — we just show a success screen
    // and let the user return to billing. If Paystack redirected here, payment succeeded.
    const trxStatus = params.get("trxref") || params.get("reference");
    if (trxStatus || ref) {
      setStatus("success");
      setMessage("Payment received. Your invoice will be updated shortly.");
    } else {
      setStatus("error");
      setMessage("Payment could not be confirmed. Please contact support.");
    }
  }, [ref, invoice, params]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {status === "loading" && <Loader2 className="mb-4 h-12 w-12 animate-spin text-muted-foreground" />}
      {status === "success" && (
        <>
          <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
          <h1 className="text-2xl font-bold">Payment Successful</h1>
          <p className="mt-2 max-w-sm text-muted-foreground">{message}</p>
          <p className="mt-1 text-xs text-muted-foreground">Ref: {ref}</p>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="mb-4 h-16 w-16 text-destructive" />
          <h1 className="text-2xl font-bold">Payment Failed</h1>
          <p className="mt-2 max-w-sm text-muted-foreground">{message}</p>
        </>
      )}
      <Button className="mt-8" onClick={() => router.push("/billing")}>
        Back to Billing
      </Button>
    </div>
  );
}
