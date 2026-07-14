"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    localStorage.removeItem("portal_token");
    localStorage.removeItem("portal_patient");
    router.replace("/portal/login");
  }, [router]);
  return null;
}
