"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  totpCode: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      ...(values.totpCode ? { totpCode: values.totpCode } : {}),
      redirect: false,
    });

    if (result?.error === "MFA_REQUIRED") {
      setRequiresMfa(true);
      return;
    }

    // Each of these used to read "Invalid credentials", which sent people to
    // reset a password that was never the problem.
    if (result?.error === "TOO_MANY_ATTEMPTS") {
      toast.error("Too many sign-in attempts. Please wait a few minutes and try again.");
      return;
    }

    if (result?.error === "SERVICE_UNAVAILABLE") {
      toast.error("Cannot reach the server right now. Your details were not the problem.");
      return;
    }

    if (result?.error) {
      toast.error("Invalid credentials. Please check your email and password.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="doctor@hospital.ng"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            className="pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      {requiresMfa && (
        <div className="space-y-2">
          <Label htmlFor="totpCode">Two-factor authentication code</Label>
          <Input
            id="totpCode"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            {...register("totpCode")}
          />
          <p className="text-xs text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {requiresMfa ? "Verify & Sign In" : "Sign In"}
      </Button>
    </form>
  );
}
