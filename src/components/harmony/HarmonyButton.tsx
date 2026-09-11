import { Sparkles } from "lucide-react";

const LABELS = {
  face: "See your Facial Harmony",
  body: "See your Body Harmony",
} as const;

export function HarmonyButton({ kind, onOpen }: { kind: "face" | "body"; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-neon/30 bg-neon/[0.1] font-bold text-neon transition active:scale-[0.985]"
    >
      <Sparkles className="size-4" /> {LABELS[kind]}
    </button>
  );
}
