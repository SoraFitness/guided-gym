import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BarChart3, Check, LockKeyhole, RefreshCw, Users } from "lucide-react";
import { useAuthSession } from "@/lib/authSession";
import { getOnboardingInsights, type OnboardingInsights } from "@/lib/onboardingInsights.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding insights — Ascendr" }] }),
  component: OnboardingInsightsPage,
});

function OnboardingInsightsPage() {
  const session = useAuthSession();
  const loadInsights = useServerFn(getOnboardingInsights);
  const query = useQuery({
    queryKey: ["admin", "onboarding-insights"],
    queryFn: () => loadInsights({ data: {} }),
    enabled: session !== "loading" && Boolean(session),
    retry: false,
  });

  return (
    <div className="min-h-dvh bg-background px-4 page-pt-safe page-pb-safe sm:px-6">
      <main className="mx-auto max-w-md">
        <header className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <Link
              to="/home"
              aria-label="Back to app"
              className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.04] text-muted-foreground transition active:scale-95"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-neon">
                Private product data
              </p>
              <h1 className="mt-1 text-[25px] font-extrabold leading-none tracking-[-0.04em]">
                Onboarding insights
              </h1>
            </div>
          </div>
          {query.data && (
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.04] text-neon transition active:scale-95"
              aria-label="Refresh insights"
            >
              <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
            </button>
          )}
        </header>

        <p className="mt-3 max-w-[46ch] text-[11px] leading-relaxed text-muted-foreground">
          Anonymous onboarding patterns and acquisition signals. Names, exact body metrics, contact
          details, and free-text notes are never stored here.
        </p>

        {session === "loading" || query.isLoading ? (
          <LoadingInsights />
        ) : query.error ? (
          <AccessState
            message={
              query.error instanceof Error ? query.error.message : "Unable to load insights."
            }
          />
        ) : query.data ? (
          <InsightsDashboard data={query.data} />
        ) : (
          <AccessState message="Sign in with an authorized administrator account to view onboarding insights." />
        )}
      </main>
    </div>
  );
}

function InsightsDashboard({ data }: { data: OnboardingInsights }) {
  return (
    <div className="mt-6 space-y-4">
      <section className="relative overflow-hidden rounded-[28px] border border-neon/20 bg-gradient-to-br from-neon/[0.15] via-surface to-surface p-5 shadow-[0_28px_58px_-40px_var(--color-neon)]">
        <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-neon/10 blur-3xl" />
        <p className="relative text-[9px] font-black uppercase tracking-[0.18em] text-neon">
          Flow health
        </p>
        <div className="relative mt-3 grid grid-cols-[1fr_auto] items-end gap-4">
          <div>
            <strong className="text-[46px] font-extrabold leading-none tracking-[-0.07em] tabular-nums">
              {data.completionRate}%
            </strong>
            <p className="mt-2 text-[11px] font-semibold text-white/75">Completion rate</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-right">
            <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
              Completed
            </p>
            <p className="mt-1 text-lg font-extrabold tabular-nums">{data.completed}</p>
          </div>
        </div>
        <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-neon"
            style={{ width: `${data.completionRate}%` }}
          />
        </div>
        <p className="relative mt-2 text-[10px] text-muted-foreground">
          {data.started} unique onboarding starts
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <InsightList title="Where people come from" icon={Users} data={data.sources} />
        <InsightList title="Top goals" icon={BarChart3} data={data.goals} />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <InsightList title="Why they start" icon={Check} data={data.motivations} />
        <InsightList title="Training days" icon={BarChart3} data={data.weeklyDays} />
      </section>

      <section className="rounded-[27px] border border-white/[0.07] bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-neon">
              Latest signals
            </p>
            <h2 className="mt-1 text-[16px] font-extrabold">Recent onboarding activity</h2>
          </div>
          <span className="grid size-9 place-items-center rounded-2xl bg-white/[0.04] text-muted-foreground">
            <Users className="size-4" />
          </span>
        </div>
        {data.recent.length ? (
          <div className="mt-3 divide-y divide-white/[0.055]">
            {data.recent.map((entry, index) => (
              <div
                key={`${entry.createdAt}-${index}`}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-xl border",
                    entry.completed
                      ? "border-neon/20 bg-neon/10 text-neon"
                      : "border-white/[0.07] bg-white/[0.035] text-muted-foreground",
                  )}
                >
                  {entry.completed ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : (
                    <Users className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold">{entry.source}</p>
                  <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
                    {entry.goal ?? "No goal yet"}
                    {entry.motivation ? ` · ${entry.motivation.replace(/_/g, " ")}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-[9px] font-bold",
                    entry.completed ? "text-neon" : "text-muted-foreground",
                  )}
                >
                  {entry.completed ? "Complete" : "Started"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            New onboarding signals will appear here as people begin the refreshed flow.
          </p>
        )}
      </section>
    </div>
  );
}

function InsightList({
  title,
  icon: Icon,
  data,
}: {
  title: string;
  icon: typeof Users;
  data: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((item) => item.count));
  return (
    <section className="min-w-0 rounded-[24px] border border-white/[0.07] bg-surface p-3.5">
      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-muted-foreground">
        <Icon className="size-3.5 text-neon" /> {title}
      </div>
      {data.length ? (
        <div className="mt-3 space-y-2.5">
          {data.slice(0, 4).map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="truncate font-semibold">{item.label.replace(/_/g, " ")}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{item.count}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-neon/75"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">No responses yet.</p>
      )}
    </section>
  );
}

function LoadingInsights() {
  return (
    <div className="mt-6 space-y-4">
      <div className="h-48 animate-pulse rounded-[28px] bg-white/[0.045]" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-48 animate-pulse rounded-[24px] bg-white/[0.045]" />
        <div className="h-48 animate-pulse rounded-[24px] bg-white/[0.045]" />
      </div>
    </div>
  );
}

function AccessState({ message }: { message: string }) {
  return (
    <section className="mt-8 rounded-[28px] border border-white/[0.08] bg-surface p-6 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/[0.05] text-muted-foreground">
        <LockKeyhole className="size-5" />
      </span>
      <h2 className="mt-4 text-lg font-extrabold">Insights are private</h2>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{message}</p>
    </section>
  );
}
