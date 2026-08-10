import { Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export const LEGAL_UPDATED = "August 8, 2026";

export function LegalPage({
  eyebrow,
  title,
  introduction,
  children,
}: {
  eyebrow: string;
  title: string;
  introduction: string;
  children: ReactNode;
}) {
  return (
    <div className="px-4 pb-32 pt-5 animate-slide-up sm:px-5">
      <header className="flex items-start gap-3 px-1">
        <Link
          to="/profile"
          aria-label="Back to profile"
          className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/[0.06] bg-surface transition active:scale-95"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neon">{eyebrow}</p>
          <h1 className="mt-1 text-[27px] font-extrabold leading-[1.05] tracking-[-0.04em]">
            {title}
          </h1>
          <p className="mt-2 text-[10px] text-muted-foreground">Last updated {LEGAL_UPDATED}</p>
        </div>
      </header>

      <section className="relative mt-5 overflow-hidden rounded-[26px] border border-neon/20 bg-gradient-to-br from-neon/[0.1] via-surface to-surface p-5">
        <div className="absolute -right-10 -top-10 size-32 rounded-full bg-neon/10 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-neon/15 text-neon">
            <ShieldCheck className="size-4" />
          </div>
          <p className="text-xs leading-relaxed text-white/75">{introduction}</p>
        </div>
      </section>

      <main className="mt-6 space-y-7">{children}</main>

      <footer className="mt-9 rounded-[24px] border border-white/[0.06] bg-white/[0.025] p-4 text-center">
        <p className="text-xs font-semibold">Questions about this policy?</p>
        <a
          href="mailto:help@ascendr.org"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-neon"
        >
          <Mail className="size-3.5" />
          help@ascendr.org
        </a>
        <nav className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2" aria-label="Legal">
          <Link to="/terms" className="text-[10px] text-muted-foreground hover:text-neon">
            Terms
          </Link>
          <Link to="/privacy" className="text-[10px] text-muted-foreground hover:text-neon">
            Privacy
          </Link>
          <Link
            to="/health-disclaimer"
            className="text-[10px] text-muted-foreground hover:text-neon"
          >
            Health & AI
          </Link>
          <Link to="/contact" className="text-[10px] text-muted-foreground hover:text-neon">
            Contact
          </Link>
          <Link to="/delete-account" className="text-[10px] text-muted-foreground hover:text-neon">
            Delete Account
          </Link>
        </nav>
      </footer>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-1">
      <h2 className="text-base font-extrabold tracking-[-0.02em]">{title}</h2>
      <div className="mt-2 space-y-3 text-xs leading-[1.7] text-muted-foreground">{children}</div>
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-neon">{children}</ul>;
}
