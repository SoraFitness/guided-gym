import { Link } from "@tanstack/react-router";
import { Play, Flame, Clock, Dumbbell } from "lucide-react";
import type { Workout } from "@/lib/workouts";
import { cn } from "@/lib/utils";

const diffBadge: Record<string, string> = {
  Beginner: "bg-emerald-400/15 text-emerald-300",
  Intermediate: "bg-amber-400/15 text-amber-300",
  Advanced: "bg-rose-400/15 text-rose-300",
};

/** Large hero card used in horizontal carousels. */
export function WorkoutCardHero({ w, className }: { w: Workout; className?: string }) {
  return (
    <Link
      to="/workout/$id"
      params={{ id: w.id }}
      className={cn(
        "snap-start shrink-0 w-[260px] rounded-[26px] overflow-hidden relative block group active:scale-[0.99] transition shadow-[0_18px_40px_-20px_oklch(0_0_0/0.8)]",
        className,
      )}
    >
      <div
        className="aspect-[4/5] relative bg-surface-2"
        style={{
          background: `linear-gradient(155deg, ${w.thumbnail.from} 0%, ${w.thumbnail.to} 100%)`,
        }}
      >
        {w.image && (
          <img
            src={w.image}
            alt={w.title}
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
            style={{ objectPosition: w.imagePosition }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />
        <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-black/50 backdrop-blur font-semibold">
          {w.category}
        </span>
        <span
          className={cn(
            "absolute top-3 right-3 text-[10px] font-semibold px-2 py-1 rounded-full backdrop-blur bg-black/40",
            diffBadge[w.difficulty],
          )}
        >
          {w.difficulty}
        </span>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-extrabold text-[17px] leading-tight">{w.title}</h3>
          <p className="text-[11px] text-white/70 mt-1 line-clamp-2">{w.description}</p>
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <Pill icon={Clock}>{w.duration} min</Pill>
            <Pill icon={Flame}>{w.calories} kcal</Pill>
            <span className="ml-auto size-10 rounded-full bg-neon text-neon-foreground grid place-items-center glow-neon group-active:scale-95 transition">
              <Play className="size-4 fill-current ml-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Wide lead recommendation that creates a clear starting point for the feed. */
export function WorkoutCardSpotlight({ w }: { w: Workout }) {
  return (
    <Link
      to="/workout/$id"
      params={{ id: w.id }}
      className="group relative block overflow-hidden rounded-[28px] border border-white/[0.08] bg-surface-2 shadow-[0_24px_50px_-28px_oklch(0_0_0/0.95)] active:scale-[0.99] transition"
    >
      <div
        className="relative aspect-[16/10]"
        style={{ background: `linear-gradient(155deg, ${w.thumbnail.from}, ${w.thumbnail.to})` }}
      >
        {w.image && (
          <img
            src={w.image}
            alt={w.title}
            className="absolute inset-0 size-full object-cover"
            style={{ objectPosition: w.imagePosition }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/20" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <span className="rounded-full bg-neon px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-neon-foreground">
            Top pick
          </span>
          <span
            className={cn(
              "rounded-full bg-black/45 px-2 py-1 text-[9px] font-semibold uppercase backdrop-blur",
              diffBadge[w.difficulty],
            )}
          >
            {w.difficulty}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neon">
            {w.category} · Best match today
          </p>
          <h2 className="mt-1 text-[22px] font-extrabold leading-tight">{w.title}</h2>
          <p className="mt-1 max-w-[85%] text-[11px] leading-relaxed text-white/70 line-clamp-2">
            {w.description}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Pill icon={Clock}>{w.duration} min</Pill>
            <Pill icon={Flame}>{w.calories} kcal</Pill>
            <span className="ml-auto grid size-10 place-items-center rounded-full bg-neon text-neon-foreground glow-neon transition group-active:scale-95">
              <Play className="ml-0.5 size-4 fill-current" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Compact row card used in vertical lists / grids. */
export function WorkoutCardRow({ w }: { w: Workout }) {
  return (
    <Link
      to="/workout/$id"
      params={{ id: w.id }}
      className="flex items-center gap-3 p-2 rounded-[20px] bg-white/[0.03] border border-white/[0.05] active:scale-[0.99] transition"
    >
      <div
        className="size-16 rounded-2xl relative overflow-hidden shrink-0 grid place-items-center text-2xl"
        style={{ background: `linear-gradient(145deg, ${w.thumbnail.from}, ${w.thumbnail.to})` }}
      >
        {w.image ? (
          <img
            src={w.image}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
            style={{ objectPosition: w.imagePosition }}
          />
        ) : (
          <span className="drop-shadow">{w.thumbnail.emoji}</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate text-[14px]">{w.title}</h3>
          <span
            className={cn(
              "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
              diffBadge[w.difficulty],
            )}
          >
            {w.difficulty[0]}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {w.duration}m
          </span>
          <span className="flex items-center gap-1">
            <Flame className="size-3" />
            {w.calories}
          </span>
          <span className="flex items-center gap-1 truncate">
            <Dumbbell className="size-3" />
            {w.targetMuscles.slice(0, 2).join(" · ")}
          </span>
        </div>
      </div>
      <div className="size-9 rounded-full bg-neon/15 text-neon grid place-items-center shrink-0">
        <Play className="size-4 fill-current ml-0.5" />
      </div>
    </Link>
  );
}

/** 2-column grid tile. */
export function WorkoutCardTile({ w }: { w: Workout }) {
  return (
    <Link
      to="/workout/$id"
      params={{ id: w.id }}
      className="rounded-[22px] overflow-hidden relative block active:scale-[0.99] transition shadow-[0_14px_30px_-18px_oklch(0_0_0/0.8)]"
    >
      <div
        className="aspect-[4/5] relative"
        style={{ background: `linear-gradient(155deg, ${w.thumbnail.from}, ${w.thumbnail.to})` }}
      >
        {w.image && (
          <img
            src={w.image}
            alt={w.title}
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
            style={{ objectPosition: w.imagePosition }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
        <span
          className={cn(
            "absolute top-2 right-2 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full backdrop-blur bg-black/40",
            diffBadge[w.difficulty],
          )}
        >
          {w.difficulty}
        </span>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="font-bold text-[13px] leading-tight">{w.title}</h3>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Pill icon={Clock} small>
              {w.duration}m
            </Pill>
            <Pill icon={Flame} small>
              {w.calories}
            </Pill>
          </div>
        </div>
      </div>
    </Link>
  );
}

function Pill({
  icon: Icon,
  children,
  small,
}: {
  icon: typeof Clock;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded-full bg-black/40 backdrop-blur flex items-center gap-1 font-medium tabular-nums",
        small ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-1",
      )}
    >
      <Icon className={small ? "size-2.5" : "size-3"} />
      {children}
    </span>
  );
}
