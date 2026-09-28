"use client";
import { apiErrorMessage } from "@/lib/api-error";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, Loader2 } from "lucide-react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PatientLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ phone: "", dateOfBirth: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      const { data } = await axios.post(`${base}/api/v1/portal/auth/login`, form);
      localStorage.setItem("portal_token", data.token);
      localStorage.setItem("portal_patient", JSON.stringify(data.patient));
      router.push("/portal");
    } catch (e: any) {
      setError(apiErrorMessage(e, "Login failed. Check your phone number and date of birth."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Stethoscope className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl">Patient Portal</CardTitle>
          <CardDescription>Sign in with your registered phone number and date of birth</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            )}
            <div className="space-y-1">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="e.g. 08012345678"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Use the phone number you registered with at the hospital.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
