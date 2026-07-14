import { Providers } from "@/components/providers";

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      {children}
    </Providers>
  );
}
