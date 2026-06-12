import { useState } from "react";
import { Plus, X, Dumbbell, Apple, Scale, Footprints } from "lucide-react";
import { QuickLogSheet } from "./QuickLogSheet";

export function QuickLogFab() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"workout" | "meal" | "weight" | "activity" | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const pick = (k: typeof kind) => {
    setKind(k);
    setOpen(false);
    setSheetOpen(true);
  };
  return (
    <>
      <div className="fixed right-4 bottom-28 z-30 flex flex-col items-end gap-2">
        {open && (
          <>
            <FabAction icon={<Footprints className="size-4" />} label="Activity" onClick={() => pick("activity")} />
            <FabAction icon={<Scale className="size-4" />} label="Weight" onClick={() => pick("weight")} />
            <FabAction icon={<Apple className="size-4" />} label="Meal" onClick={() => pick("meal")} />
            <FabAction icon={<Dumbbell className="size-4" />} label="Workout" onClick={() => pick("workout")} />
          </>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          className="size-14 rounded-full bg-neon text-neon-foreground grid place-items-center shadow-xl shadow-neon/30 active:scale-95 transition"
          aria-label="Quick log"
        >
          {open ? <X className="size-6" /> : <Plus className="size-6" />}
        </button>
      </div>
      <QuickLogSheet kind={kind} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}

function FabAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 pl-3 pr-4 h-11 rounded-full bg-surface border border-white/10 text-sm font-semibold active:scale-95 transition"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
