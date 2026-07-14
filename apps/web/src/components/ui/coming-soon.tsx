import { Construction } from "lucide-react";

interface ComingSoonProps {
  module: string;
  description?: string;
  features?: string[];
}

export function ComingSoon({ module, description, features }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
        <Construction className="h-8 w-8 text-amber-600" />
      </div>
      <h2 className="text-xl font-bold">{module}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description ?? `The ${module} module is being built and will be available in Phase 2.`}
      </p>
      {features && features.length > 0 && (
        <div className="mt-6 rounded-xl border bg-muted/40 px-6 py-4 text-left">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Planned features
          </p>
          <ul className="space-y-1.5">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
