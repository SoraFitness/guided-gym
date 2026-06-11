import { createFileRoute } from "@tanstack/react-router";
import { Flame, Clock, Trophy, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_app/progress")({
  head: () => ({ meta: [{ title: "Progress — Pulse" }] }),
  component: ProgressPage,
});

const week = [
  { d: "Mon", v: 60 },
  { d: "Tue", v: 30 },
  { d: "Wed", v: 80 },
  { d: "Thu", v: 45 },
  { d: "Fri", v: 95 },
  { d: "Sat", v: 70 },
  { d: "Sun", v: 20 },
];

function ProgressPage() {
  return (
    <div className="px-5 pt-6 animate-slide-up">
      <h1 className="text-3xl font-bold">Progress</h1>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <StatCard icon={Flame} label="This week" value="2,140" unit="kcal" />
        <StatCard icon={Clock} label="Trained" value="3h 42m" />
        <StatCard icon={Trophy} label="Streak" value="6 days" />
        <StatCard icon={TrendingUp} label="vs last week" value="+12%" tint />
      </div>

      <section className="mt-8 rounded-3xl bg-surface p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold">Weekly activity</h2>
          <span className="text-xs text-muted-foreground">Minutes</span>
        </div>
        <div className="h-44 flex items-end gap-3">
          {week.map((day) => (
            <div key={day.d} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full rounded-t-xl bg-gradient-to-t from-neon to-emerald-300 transition-all"
                style={{ height: `${day.v}%` }}
              />
              <span className="text-[11px] text-muted-foreground">{day.d}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl bg-surface p-5">
        <h2 className="font-bold mb-3">Personal records</h2>
        <Record label="Longest streak" value="12 days" />
        <Record label="Most kcal in a day" value="640" />
        <Record label="Best week" value="2,840 kcal" last />
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, unit, tint,
}: { icon: typeof Flame; label: string; value: string; unit?: string; tint?: boolean }) {
  return (
    <div className={`rounded-3xl p-4 ${tint ? "bg-neon text-neon-foreground" : "bg-surface"}`}>
      <Icon className="size-5" />
      <div className="mt-6 text-2xl font-extrabold">
        {value}
        {unit && <span className="text-sm font-medium ml-1 opacity-70">{unit}</span>}
      </div>
      <div className={`text-xs ${tint ? "opacity-80" : "text-muted-foreground"}`}>{label}</div>
    </div>
  );
}

function Record({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between py-3 ${last ? "" : "border-b border-border"}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
