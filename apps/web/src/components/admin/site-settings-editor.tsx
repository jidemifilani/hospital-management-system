"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import {
  Loader2, Plus, Trash2, Palette, ImageIcon, BarChart2,
  Briefcase, CheckSquare, Users, UserCircle, Phone, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeroSlide {
  badge: string; headline: string; accent: string; body: string;
  cta1Label: string; cta1Href: string; cta2Label: string; cta2Href: string;
  image: string; overlay: string;
}
interface Stat      { value: string; label: string; }
interface Service   { icon: string; title: string; description: string; color: string; }
interface Leader    { initials: string; name: string; title: string; qualifications: string; bio: string; bg: string; }
interface Doctor    { name: string; specialty: string; qualifications: string; experience: string; availability: string; bg: string; }
interface Contact   { phone: string; emergencyPhone: string; email: string; address: string; }
interface SiteContent {
  hospitalName: string; tagline: string;
  hero: { slides: HeroSlide[] };
  stats: Stat[]; services: Service[]; whyUs: string[];
  leadership: Leader[]; doctors: Doctor[]; contact: Contact;
}
interface SiteTheme { primaryColor: string; borderRadius: string; fontFamily: string; }
interface SiteSettings { content: SiteContent; theme: SiteTheme; }

// ─── Hex ↔ HSL helpers ───────────────────────────────────────────────────────

function hexToHslStr(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return "222 47% 11%";
  let [rv, gv, bv] = [parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255];
  const max = Math.max(rv, gv, bv), min = Math.min(rv, gv, bv);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rv) h = ((gv - bv) / d + (gv < bv ? 6 : 0)) / 6;
    else if (max === gv) h = ((bv - rv) / d + 2) / 6;
    else h = ((rv - gv) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function isDark(hex: string): boolean {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return true;
  const lum = (0.299 * parseInt(r[1], 16) + 0.587 * parseInt(r[2], 16) + 0.114 * parseInt(r[3], 16)) / 255;
  return lum < 0.5;
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function SaveBtn({ saving }: { saving: boolean }) {
  return (
    <Button type="submit" disabled={saving} size="sm">
      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {saving ? "Saving…" : "Save Changes"}
    </Button>
  );
}

function Field({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

// ─── Theme Tab ────────────────────────────────────────────────────────────────

function ThemeTab({ theme, onSave }: { theme: SiteTheme; onSave: (t: SiteTheme) => Promise<void> }) {
  const [draft, setDraft] = useState<SiteTheme>(theme);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(theme), [theme]);

  const hsl = hexToHslStr(draft.primaryColor);
  const fg  = isDark(draft.primaryColor) ? "0 0% 98%" : "0 0% 9%";

  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(draft); setSaving(false); }} className="space-y-6">
      {/* Live preview swatch */}
      <div
        className="flex h-20 items-center justify-center rounded-xl text-sm font-semibold"
        style={{ background: `hsl(${hsl})`, color: `hsl(${fg})` }}
      >
        Primary Color Preview
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Field label="Primary Colour" id="primaryColor">
          <div className="flex gap-2">
            <input
              id="primaryColor"
              type="color"
              value={draft.primaryColor}
              onChange={(e) => setDraft({ ...draft, primaryColor: e.target.value })}
              className="h-10 w-14 cursor-pointer rounded border p-1"
            />
            <Input
              value={draft.primaryColor}
              onChange={(e) => setDraft({ ...draft, primaryColor: e.target.value })}
              placeholder="#1d4ed8"
              className="font-mono"
            />
          </div>
          <p className="text-xs text-muted-foreground">HSL: {hsl}</p>
        </Field>

        <Field label="Border Radius" id="borderRadius">
          <select
            id="borderRadius"
            value={draft.borderRadius}
            onChange={(e) => setDraft({ ...draft, borderRadius: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="0rem">None (Sharp)</option>
            <option value="0.25rem">Small</option>
            <option value="0.5rem">Medium (default)</option>
            <option value="0.75rem">Large</option>
            <option value="1rem">Extra Large</option>
          </select>
        </Field>

        <Field label="Font Family" id="fontFamily">
          <select
            id="fontFamily"
            value={draft.fontFamily}
            onChange={(e) => setDraft({ ...draft, fontFamily: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="inter">Inter (default)</option>
            <option value="poppins">Poppins</option>
            <option value="nunito">Nunito</option>
            <option value="lato">Lato</option>
          </select>
        </Field>
      </div>

      <div className="flex justify-end">
        <SaveBtn saving={saving} />
      </div>
    </form>
  );
}

// ─── Hero Slides Tab ─────────────────────────────────────────────────────────

function HeroTab({ slides, onSave }: { slides: HeroSlide[]; onSave: (s: HeroSlide[]) => Promise<void> }) {
  const [draft, setDraft] = useState<HeroSlide[]>(slides);
  const [open, setOpen] = useState<number | null>(0);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(slides), [slides]);

  function update(i: number, key: keyof HeroSlide, val: string) {
    setDraft((d) => d.map((s, idx) => idx === i ? { ...s, [key]: val } : s));
  }

  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(draft); setSaving(false); }} className="space-y-4">
      {draft.map((slide, i) => (
        <Card key={i} className="border">
          <button
            type="button"
            className="flex w-full items-center justify-between p-4 text-left"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <div>
              <span className="font-semibold">Slide {i + 1}</span>
              <span className="ml-3 text-sm text-muted-foreground">{slide.headline} {slide.accent}</span>
            </div>
            {open === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {open === i && (
            <CardContent className="grid gap-4 border-t pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Badge / Tagline" id={`badge-${i}`}>
                  <Input id={`badge-${i}`} value={slide.badge} onChange={(e) => update(i, "badge", e.target.value)} />
                </Field>
                <Field label="Image URL" id={`image-${i}`}>
                  <Input id={`image-${i}`} value={slide.image} onChange={(e) => update(i, "image", e.target.value)} placeholder="https://..." />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Headline" id={`headline-${i}`}>
                  <Input id={`headline-${i}`} value={slide.headline} onChange={(e) => update(i, "headline", e.target.value)} />
                </Field>
                <Field label="Accent (highlighted word)" id={`accent-${i}`}>
                  <Input id={`accent-${i}`} value={slide.accent} onChange={(e) => update(i, "accent", e.target.value)} />
                </Field>
              </div>
              <Field label="Body Text" id={`body-${i}`}>
                <Textarea id={`body-${i}`} rows={3} value={slide.body} onChange={(e) => update(i, "body", e.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Primary Button Label" id={`cta1l-${i}`}>
                  <Input id={`cta1l-${i}`} value={slide.cta1Label} onChange={(e) => update(i, "cta1Label", e.target.value)} />
                </Field>
                <Field label="Primary Button Link" id={`cta1h-${i}`}>
                  <Input id={`cta1h-${i}`} value={slide.cta1Href} onChange={(e) => update(i, "cta1Href", e.target.value)} />
                </Field>
                <Field label="Secondary Button Label" id={`cta2l-${i}`}>
                  <Input id={`cta2l-${i}`} value={slide.cta2Label} onChange={(e) => update(i, "cta2Label", e.target.value)} />
                </Field>
                <Field label="Secondary Button Link" id={`cta2h-${i}`}>
                  <Input id={`cta2h-${i}`} value={slide.cta2Href} onChange={(e) => update(i, "cta2Href", e.target.value)} />
                </Field>
              </div>
              <Field label="Overlay Gradient CSS" id={`overlay-${i}`}>
                <Input id={`overlay-${i}`} value={slide.overlay} onChange={(e) => update(i, "overlay", e.target.value)} className="font-mono text-xs" />
                <p className="text-xs text-muted-foreground">Controls text readability over the image. Leave unchanged unless you know CSS gradients.</p>
              </Field>
            </CardContent>
          )}
        </Card>
      ))}
      <div className="flex justify-end">
        <SaveBtn saving={saving} />
      </div>
    </form>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

function StatsTab({ stats, onSave }: { stats: Stat[]; onSave: (s: Stat[]) => Promise<void> }) {
  const [draft, setDraft] = useState<Stat[]>(stats);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(stats), [stats]);

  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(draft); setSaving(false); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {draft.map((stat, i) => (
          <Card key={i} className="border">
            <CardContent className="flex gap-3 pt-4">
              <div className="flex-1 space-y-2">
                <Field label="Value" id={`stat-val-${i}`}>
                  <Input id={`stat-val-${i}`} value={stat.value} onChange={(e) => setDraft(d => d.map((s, idx) => idx === i ? { ...s, value: e.target.value } : s))} placeholder="50k+" />
                </Field>
                <Field label="Label" id={`stat-lbl-${i}`}>
                  <Input id={`stat-lbl-${i}`} value={stat.label} onChange={(e) => setDraft(d => d.map((s, idx) => idx === i ? { ...s, label: e.target.value } : s))} placeholder="Patients Treated" />
                </Field>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-end">
        <SaveBtn saving={saving} />
      </div>
    </form>
  );
}

// ─── Services Tab ─────────────────────────────────────────────────────────────

function ServicesTab({ services, onSave }: { services: Service[]; onSave: (s: Service[]) => Promise<void> }) {
  const [draft, setDraft] = useState<Service[]>(services);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(services), [services]);

  function update(i: number, key: keyof Service, val: string) {
    setDraft((d) => d.map((s, idx) => idx === i ? { ...s, [key]: val } : s));
  }

  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(draft); setSaving(false); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {draft.map((svc, i) => (
          <Card key={i} className="border">
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">{svc.icon}</Badge>
                <span className="text-sm font-medium">{svc.title}</span>
              </div>
              <Field label="Service Title" id={`svc-title-${i}`}>
                <Input id={`svc-title-${i}`} value={svc.title} onChange={(e) => update(i, "title", e.target.value)} />
              </Field>
              <Field label="Description" id={`svc-desc-${i}`}>
                <Textarea id={`svc-desc-${i}`} rows={2} value={svc.description} onChange={(e) => update(i, "description", e.target.value)} />
              </Field>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-end">
        <SaveBtn saving={saving} />
      </div>
    </form>
  );
}

// ─── Why Us Tab ───────────────────────────────────────────────────────────────

function WhyUsTab({ items, onSave }: { items: string[]; onSave: (s: string[]) => Promise<void> }) {
  const [draft, setDraft] = useState<string[]>(items);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(items), [items]);

  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(draft); setSaving(false); }} className="space-y-3">
      {draft.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={item}
            onChange={(e) => setDraft((d) => d.map((v, idx) => idx === i ? e.target.value : v))}
            placeholder={`Reason ${i + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-destructive hover:text-destructive"
            onClick={() => setDraft((d) => d.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => setDraft((d) => [...d, ""])}>
        <Plus className="mr-2 h-4 w-4" />Add Point
      </Button>
      <div className="flex justify-end">
        <SaveBtn saving={saving} />
      </div>
    </form>
  );
}

// ─── Leadership Tab ───────────────────────────────────────────────────────────

function LeadershipTab({ leaders, onSave }: { leaders: Leader[]; onSave: (s: Leader[]) => Promise<void> }) {
  const [draft, setDraft] = useState<Leader[]>(leaders);
  const [open, setOpen] = useState<number | null>(0);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(leaders), [leaders]);

  function update(i: number, key: keyof Leader, val: string) {
    setDraft((d) => d.map((l, idx) => idx === i ? { ...l, [key]: val } : l));
  }

  const EMPTY_LEADER: Leader = { initials: "", name: "", title: "", qualifications: "", bio: "", bg: "linear-gradient(135deg,#1d4ed8,#1e3a8a)" };

  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(draft); setSaving(false); }} className="space-y-4">
      {draft.map((leader, i) => (
        <Card key={i} className="border">
          <button type="button" className="flex w-full items-center justify-between p-4 text-left" onClick={() => setOpen(open === i ? null : i)}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: leader.bg }}>{leader.initials || "?"}</div>
              <div>
                <p className="font-semibold">{leader.name || "Unnamed"}</p>
                <p className="text-xs text-muted-foreground">{leader.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDraft((d) => d.filter((_, idx) => idx !== i)); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
              {open === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>

          {open === i && (
            <CardContent className="grid gap-4 border-t pt-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Initials" id={`l-init-${i}`}><Input id={`l-init-${i}`} maxLength={3} value={leader.initials} onChange={(e) => update(i, "initials", e.target.value.toUpperCase())} /></Field>
                <Field label="Full Name" id={`l-name-${i}`}><Input id={`l-name-${i}`} value={leader.name} onChange={(e) => update(i, "name", e.target.value)} /></Field>
                <Field label="Title / Role" id={`l-title-${i}`}><Input id={`l-title-${i}`} value={leader.title} onChange={(e) => update(i, "title", e.target.value)} /></Field>
              </div>
              <Field label="Qualifications" id={`l-qual-${i}`}><Input id={`l-qual-${i}`} value={leader.qualifications} onChange={(e) => update(i, "qualifications", e.target.value)} /></Field>
              <Field label="Biography" id={`l-bio-${i}`}><Textarea id={`l-bio-${i}`} rows={3} value={leader.bio} onChange={(e) => update(i, "bio", e.target.value)} /></Field>
              <Field label="Card Gradient (CSS)" id={`l-bg-${i}`}>
                <Input id={`l-bg-${i}`} value={leader.bg} onChange={(e) => update(i, "bg", e.target.value)} className="font-mono text-xs" />
              </Field>
            </CardContent>
          )}
        </Card>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => { setDraft((d) => [...d, EMPTY_LEADER]); setOpen(draft.length); }}>
        <Plus className="mr-2 h-4 w-4" />Add Member
      </Button>
      <div className="flex justify-end">
        <SaveBtn saving={saving} />
      </div>
    </form>
  );
}

// ─── Doctors Tab ──────────────────────────────────────────────────────────────

function DoctorsTab({ doctors, onSave }: { doctors: Doctor[]; onSave: (s: Doctor[]) => Promise<void> }) {
  const [draft, setDraft] = useState<Doctor[]>(doctors);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(doctors), [doctors]);

  function update(i: number, key: keyof Doctor, val: string) {
    setDraft((d) => d.map((doc, idx) => idx === i ? { ...doc, [key]: val } : doc));
  }

  const EMPTY_DOC: Doctor = { name: "", specialty: "", qualifications: "", experience: "", availability: "", bg: "linear-gradient(135deg,#2563eb,#1e3a8a)" };

  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(draft); setSaving(false); }} className="space-y-4">
      {draft.map((doc, i) => (
        <Card key={i} className="border">
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: doc.bg }}>
                  {doc.name.split(" ").slice(1).map((n) => n[0]).join("") || "?"}
                </div>
                <span className="font-semibold">{doc.name || "Unnamed doctor"}</span>
              </div>
              <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setDraft((d) => d.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Separator />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full Name" id={`d-name-${i}`}><Input id={`d-name-${i}`} value={doc.name} onChange={(e) => update(i, "name", e.target.value)} placeholder="Dr. John Doe" /></Field>
              <Field label="Specialty" id={`d-spec-${i}`}><Input id={`d-spec-${i}`} value={doc.specialty} onChange={(e) => update(i, "specialty", e.target.value)} /></Field>
              <Field label="Qualifications" id={`d-qual-${i}`}><Input id={`d-qual-${i}`} value={doc.qualifications} onChange={(e) => update(i, "qualifications", e.target.value)} /></Field>
              <Field label="Experience" id={`d-exp-${i}`}><Input id={`d-exp-${i}`} value={doc.experience} onChange={(e) => update(i, "experience", e.target.value)} placeholder="10 years" /></Field>
              <Field label="Availability" id={`d-avail-${i}`}><Input id={`d-avail-${i}`} value={doc.availability} onChange={(e) => update(i, "availability", e.target.value)} placeholder="Mon–Fri" /></Field>
              <Field label="Card Gradient (CSS)" id={`d-bg-${i}`}><Input id={`d-bg-${i}`} value={doc.bg} onChange={(e) => update(i, "bg", e.target.value)} className="font-mono text-xs" /></Field>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => setDraft((d) => [...d, EMPTY_DOC])}>
        <Plus className="mr-2 h-4 w-4" />Add Doctor
      </Button>
      <div className="flex justify-end">
        <SaveBtn saving={saving} />
      </div>
    </form>
  );
}

// ─── Contact Tab ──────────────────────────────────────────────────────────────

function ContactTab({ contact, onSave }: { contact: Contact; onSave: (c: Contact) => Promise<void> }) {
  const [draft, setDraft] = useState<Contact>(contact);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(contact), [contact]);

  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(draft); setSaving(false); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Main Phone" id="phone"><Input id="phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+234 1 000 0000" /></Field>
        <Field label="Emergency Phone" id="emergencyPhone"><Input id="emergencyPhone" value={draft.emergencyPhone} onChange={(e) => setDraft({ ...draft, emergencyPhone: e.target.value })} placeholder="0800 000 0000" /></Field>
        <Field label="Email Address" id="email"><Input id="email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
        <Field label="Physical Address" id="address"><Input id="address" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></Field>
      </div>
      <div className="flex justify-end">
        <SaveBtn saving={saving} />
      </div>
    </form>
  );
}

// ─── General Tab ─────────────────────────────────────────────────────────────

function GeneralTab({ content, onSave }: { content: SiteContent; onSave: (patch: Partial<SiteContent>) => Promise<void> }) {
  const [hospitalName, setHospitalName] = useState(content.hospitalName);
  const [tagline, setTagline] = useState(content.tagline);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setHospitalName(content.hospitalName); setTagline(content.tagline); }, [content]);

  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave({ hospitalName, tagline }); setSaving(false); }} className="space-y-4">
      <Field label="Hospital Name" id="hospitalName"><Input id="hospitalName" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} /></Field>
      <Field label="Tagline" id="tagline"><Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} /></Field>
      <div className="flex justify-end"><SaveBtn saving={saving} /></div>
    </form>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function SiteSettingsEditor() {
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: () => api.get("/site-settings").then((r) => r.data),
  });

  const contentMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => api.patch("/site-settings/content", patch).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["site-settings"] }); toast.success("Content saved"); },
    onError:   () => toast.error("Failed to save content"),
  });

  const themeMutation = useMutation({
    mutationFn: (theme: SiteTheme) => api.patch("/site-settings/theme", theme).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["site-settings"] }); toast.success("Theme saved"); },
    onError:   () => toast.error("Failed to save theme"),
  });

  if (isLoading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (isError || !data) return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
      Failed to load site settings. Make sure the API is running.
    </div>
  );

  const { content, theme } = data;

  const saveContent = (patch: Record<string, unknown>) => contentMutation.mutateAsync(patch);
  const saveTheme   = (t: SiteTheme) => themeMutation.mutateAsync(t);

  return (
    <Tabs defaultValue="theme">
      <TabsList className="mb-6 flex flex-wrap gap-1 h-auto">
        <TabsTrigger value="theme"      className="gap-1.5"><Palette      className="h-3.5 w-3.5" />Theme</TabsTrigger>
        <TabsTrigger value="general"    className="gap-1.5"><Briefcase    className="h-3.5 w-3.5" />General</TabsTrigger>
        <TabsTrigger value="hero"       className="gap-1.5"><ImageIcon    className="h-3.5 w-3.5" />Hero Slider</TabsTrigger>
        <TabsTrigger value="stats"      className="gap-1.5"><BarChart2    className="h-3.5 w-3.5" />Stats</TabsTrigger>
        <TabsTrigger value="services"   className="gap-1.5"><Briefcase    className="h-3.5 w-3.5" />Services</TabsTrigger>
        <TabsTrigger value="whyus"      className="gap-1.5"><CheckSquare  className="h-3.5 w-3.5" />Why Us</TabsTrigger>
        <TabsTrigger value="leadership" className="gap-1.5"><Users        className="h-3.5 w-3.5" />Leadership</TabsTrigger>
        <TabsTrigger value="doctors"    className="gap-1.5"><UserCircle   className="h-3.5 w-3.5" />Doctors</TabsTrigger>
        <TabsTrigger value="contact"    className="gap-1.5"><Phone        className="h-3.5 w-3.5" />Contact</TabsTrigger>
      </TabsList>

      <TabsContent value="theme">
        <Card><CardHeader><CardTitle>Theme</CardTitle><CardDescription>Customise the website's colour scheme, typography, and shape.</CardDescription></CardHeader>
          <CardContent><ThemeTab theme={theme} onSave={saveTheme} /></CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="general">
        <Card><CardHeader><CardTitle>General</CardTitle><CardDescription>Hospital name and tagline used across the site.</CardDescription></CardHeader>
          <CardContent><GeneralTab content={content} onSave={(patch) => saveContent(patch as Record<string, unknown>)} /></CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="hero">
        <Card><CardHeader><CardTitle>Hero Slider</CardTitle><CardDescription>Edit the rotating banner at the top of the homepage. Each slide has its own image, text, and call-to-action buttons.</CardDescription></CardHeader>
          <CardContent><HeroTab slides={content.hero?.slides ?? []} onSave={(s) => saveContent({ hero: { slides: s } })} /></CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="stats">
        <Card><CardHeader><CardTitle>Stats Bar</CardTitle><CardDescription>The four key numbers shown below the hero (e.g. "50k+ Patients Treated").</CardDescription></CardHeader>
          <CardContent><StatsTab stats={content.stats ?? []} onSave={(s) => saveContent({ stats: s })} /></CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="services">
        <Card><CardHeader><CardTitle>Services</CardTitle><CardDescription>Edit the service cards shown on the homepage. Icons are fixed; you can change titles and descriptions.</CardDescription></CardHeader>
          <CardContent><ServicesTab services={content.services ?? []} onSave={(s) => saveContent({ services: s })} /></CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="whyus">
        <Card><CardHeader><CardTitle>Why Choose Us</CardTitle><CardDescription>Bullet points listed in the "Why Patients Choose CareSync" section.</CardDescription></CardHeader>
          <CardContent><WhyUsTab items={content.whyUs ?? []} onSave={(s) => saveContent({ whyUs: s })} /></CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="leadership">
        <Card><CardHeader><CardTitle>Board &amp; Medical Leadership</CardTitle><CardDescription>Directors, Medical Director, and senior management profiles shown on the homepage.</CardDescription></CardHeader>
          <CardContent><LeadershipTab leaders={content.leadership ?? []} onSave={(s) => saveContent({ leadership: s })} /></CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="doctors">
        <Card><CardHeader><CardTitle>Featured Doctors</CardTitle><CardDescription>Doctor profiles shown in the "Meet Our Specialists" section.</CardDescription></CardHeader>
          <CardContent><DoctorsTab doctors={content.doctors ?? []} onSave={(s) => saveContent({ doctors: s })} /></CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="contact">
        <Card><CardHeader><CardTitle>Contact Information</CardTitle><CardDescription>Phone numbers, email, and address shown in the footer and contact page.</CardDescription></CardHeader>
          <CardContent><ContactTab contact={content.contact ?? { phone: "", emergencyPhone: "", email: "", address: "" }} onSave={(c) => saveContent({ contact: c })} /></CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
