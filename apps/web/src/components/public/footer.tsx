import Link from "next/link";
import { Stethoscope, Phone, Mail, MapPin, Facebook, Twitter, Linkedin } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
                <Stethoscope className="h-5 w-5" />
              </div>
              <span className="font-bold">CareSync HMS</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Delivering world-class healthcare with compassion, technology, and trust since 2010.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-muted-foreground shadow-sm hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                { href: "/about", label: "About Us" },
                { href: "/services", label: "Our Services" },
                { href: "/doctors", label: "Find a Doctor" },
                { href: "/contact", label: "Contact Us" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-foreground">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Departments</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Outpatient Clinic",
                "Emergency & Trauma",
                "Surgery",
                "Pediatrics",
                "Laboratory",
                "Radiology",
              ].map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Contact</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                1 Hospital Road, Victoria Island, Lagos, Nigeria
              </li>
              <li className="flex gap-2">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <a href="tel:+2348000000000" className="hover:text-foreground">
                  +234 800 000 0000
                </a>
              </li>
              <li className="flex gap-2">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <a href="mailto:info@caresync.ng" className="hover:text-foreground">
                  info@caresync.ng
                </a>
              </li>
            </ul>
            <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm">
              <span className="font-semibold text-red-700">Emergency: </span>
              <a href="tel:+2348000000000" className="font-bold text-red-700">
                0800 000 0000
              </a>
              <p className="text-xs text-red-600">24/7 Available</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t pt-8 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} CareSync General Hospital. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
