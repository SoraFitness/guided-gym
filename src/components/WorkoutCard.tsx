import { Link } from "@tanstack/react-router";
import { Play, Flame, Clock, ChevronRight } from "lucide-react";
import type { Workout } from "@/lib/workouts";
import { cn } from "@/lib/utils";
import { FOCUS_LABELS } from "@/lib/profile";
import { DifficultyBadge } from "@/components/app/kit";

/** Large hero card used in horizontal carousels. */
export function WorkoutCardHero({ w, className }: { w: Workout; className?: string }) {
  return (
    <Link
      to="/workout/$id"
      params={{ id: w.id }}
      className={cn(
        "group relative block w-[260px] shrink-0 snap-start overflow-hidden rounded-[24px] border border-hairline transition active:scale-[0.99]",
        className,
      )}
    >
      <div
        className="relative aspect-[4/5] bg-surface-2"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/10" />
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-semibold backdrop-blur">
          {w.category}
        </span>
        <span className="absolute right-3 top-3">
          <DifficultyBadge level={w.difficulty} />
        </span>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-[18px] font-bold leading-tight">{w.title}</h3>
          <p className="mt-1 truncate text-[13px] font-semibold text-neon">{formatTargets(w)}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <Pill icon={Clock}>{w.duration} min</Pill>
            <Pill icon={Flame}>{w.calories}</Pill>
            <span className="ml-auto grid size-10 place-items-center rounded-full bg-neon text-neon-foreground transition group-active:scale-95">
              <Play className="ml-0.5 size-4 fill-current" />
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
      className="group relative block overflow-hidden rounded-[24px] border border-hairline bg-surface-2 transition active:scale-[0.99]"
    >
      <div
        className="relative aspect-[16/10]"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/10" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <span className="rounded-full bg-neon px-2.5 py-1 text-[12px] font-bold text-neon-foreground">
            Top pick
          </span>
          <DifficultyBadge level={w.difficulty} />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-[13px] font-semibold text-neon">{formatTargets(w)}</p>
          <h2 className="mt-1 text-[22px] font-bold leading-tight">{w.title}</h2>
          <div className="mt-3 flex items-center gap-2">
            <Pill icon={Clock}>{w.duration} min</Pill>
            <Pill icon={Flame}>{w.calories} kcal</Pill>
            <span className="ml-auto grid size-11 place-items-center rounded-full bg-neon text-neon-foreground transition group-active:scale-95">
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
      className="flex items-center gap-3.5 rounded-[20px] border border-hairline bg-surface p-3 transition active:scale-[0.99]"
    >
      <div
        className="relative grid size-[60px] shrink-0 place-items-center overflow-hidden rounded-[16px] text-2xl"
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
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[16px] font-bold">{w.title}</h3>
        <p className="mt-0.5 truncate text-[13px] font-semibold text-neon">
          {w.duration} min · {w.calories} kcal
        </p>
        <div className="mt-1.5 flex min-w-0 items-center gap-2">
          <DifficultyBadge level={w.difficulty} />
          <span className="truncate text-[12px] text-muted-foreground">{formatTargets(w)}</span>
        </div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/** 2-column grid tile. */
export function WorkoutCardTile({ w }: { w: Workout }) {
  return (
    <Link
      to="/workout/$id"
      params={{ id: w.id }}
      className="relative block overflow-hidden rounded-[20px] border border-hairline transition active:scale-[0.99]"
    >
      <div
        className="relative aspect-[4/5]"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/5" />
        <span className="absolute right-2 top-2">
          <DifficultyBadge level={w.difficulty} />
        </span>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="text-[15px] font-bold leading-tight">{w.title}</h3>
          <p className="mt-1 truncate text-[12px] font-semibold text-neon">{formatTargets(w)}</p>
          <div className="mt-2 flex items-center gap-1.5">
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

function formatTargets(workout: Workout) {
  return workout.targetMuscles
    .slice(0, 3)
    .map((target) => FOCUS_LABELS[target])
    .join(" · ");
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
        "flex items-center gap-1 rounded-full bg-black/50 font-semibold tabular-nums backdrop-blur",
        small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]",
      )}
    >
      <Icon className={small ? "size-3" : "size-3.5"} />
      {children}
    </span>
  );
}
