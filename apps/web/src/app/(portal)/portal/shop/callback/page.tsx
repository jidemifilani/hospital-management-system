"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { portalApi } from "@/lib/portal-api";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function ShopCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const reference = params.get("reference") ?? params.get("trxref") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");

  useEffect(() => {
    if (!reference) { setStatus("failed"); return; }
    portalApi.get(`/shop/callback?reference=${reference}`)
      .then(({ data }) => setStatus(data.confirmed ? "success" : "failed"))
      .catch(() => setStatus("failed"));
  }, [reference]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      {status === "loading" && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Confirming your payment…</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 className="h-14 w-14 text-green-500" />
          <div>
            <p className="text-xl font-bold">Payment confirmed!</p>
            <p className="text-sm text-muted-foreground mt-1">Your order has been placed and is being processed.</p>
          </div>
          <Button onClick={() => router.push("/portal/orders")}>View your orders</Button>
        </>
      )}
      {status === "failed" && (
        <>
          <XCircle className="h-14 w-14 text-red-500" />
          <div>
            <p className="text-xl font-bold">Payment could not be confirmed</p>
            <p className="text-sm text-muted-foreground mt-1">
              If you were charged, please contact the billing desk with your reference: <strong>{reference}</strong>
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push("/portal/shop")}>Back to shop</Button>
            <Button onClick={() => router.push("/portal/bills")}>View bills</Button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * useSearchParams() has to sit inside a Suspense boundary.
 *
 * Without one the page cannot be prerendered -- `next build` fails with
 * "useSearchParams() should be wrapped in a suspense boundary", and the
 * production build of the whole web app fails with it. The dev server does
 * not care, which is why this went unnoticed.
 */
export default function ShopCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Confirming your payment…</p>
        </div>
      }
    >
      <ShopCallback />
    </Suspense>
  );
}
