import { motion } from "framer-motion";
import { scoreColor } from "@/components/app/kit";

type Feature = { label: string; score: number };

// Line-art face on a 340 × 290 canvas, centred on x = 170, with a scored
// hotspot per feature and a callout leading to its label.
const OUTLINE =
  "M170 22 C118 22 98 62 100 112 C102 162 118 206 148 236 C158 246 182 246 192 236 C222 206 238 162 240 112 C242 62 222 22 170 22 Z";
const JAW = "M106 146 C112 188 138 228 170 239 C202 228 228 188 234 146";

export function FaceFeatureMap({
  symmetry,
  eyes,
  skin,
  jawline,
}: {
  symmetry: Feature;
  eyes: Feature;
  skin: Feature;
  jawline: Feature;
}) {
  const callouts = [
    { feature: symmetry, dot: [170, 52], elbow: [244, 40], anchor: "start" as const },
    { feature: eyes, dot: [143, 111], elbow: [76, 96], anchor: "end" as const },
    { feature: skin, dot: [212, 152], elbow: [262, 152], anchor: "start" as const },
    { feature: jawline, dot: [130, 214], elbow: [76, 226], anchor: "end" as const },
  ];

  return (
    <svg
      viewBox="0 0 340 290"
      className="h-auto w-full"
      role="img"
      aria-label="Facial feature scores"
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={OUTLINE} stroke="oklch(1 0 0 / 22%)" strokeWidth="1.6" />
        <motion.path
          d={JAW}
          stroke={scoreColor(jawline.score)}
          strokeWidth="3.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, delay: 0.2 }}
        />
        <motion.line
          x1="170"
          x2="170"
          y1="30"
          y2="250"
          stroke={scoreColor(symmetry.score)}
          strokeWidth="1.5"
          strokeDasharray="4 6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 0.4 }}
        />
        {/* Brows */}
        <path d="M128 96 Q142 88 156 94" stroke="oklch(1 0 0 / 35%)" strokeWidth="2.2" />
        <path d="M184 94 Q198 88 212 96" stroke="oklch(1 0 0 / 35%)" strokeWidth="2.2" />
        {/* Eyes */}
        {[
          "M130 112 Q143 103 156 112 Q143 119 130 112 Z",
          "M184 112 Q197 103 210 112 Q197 119 184 112 Z",
        ].map((d) => (
          <path key={d} d={d} stroke={scoreColor(eyes.score)} strokeWidth="2" />
        ))}
        {/* Nose and mouth */}
        <path
          d="M170 116 L163 154 Q170 161 177 154"
          stroke="oklch(1 0 0 / 28%)"
          strokeWidth="1.8"
        />
        <path
          d="M150 184 Q170 176 190 184 Q170 195 150 184"
          stroke="oklch(1 0 0 / 30%)"
          strokeWidth="1.8"
        />
      </g>

      {callouts.map(({ feature, dot, elbow, anchor }, index) => {
        const color = scoreColor(feature.score);
        const textX = anchor === "end" ? elbow[0] - 6 : elbow[0] + 6;
        return (
          <motion.g
            key={feature.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 + index * 0.12 }}
          >
            <line
              x1={dot[0]}
              y1={dot[1]}
              x2={elbow[0]}
              y2={elbow[1]}
              stroke="oklch(1 0 0 / 30%)"
              strokeWidth="1"
            />
            <circle cx={dot[0]} cy={dot[1]} r="9" fill={color} fillOpacity="0.22" />
            <circle cx={dot[0]} cy={dot[1]} r="4.5" fill={color} />
            <text
              x={textX}
              y={elbow[1] - 3}
              textAnchor={anchor}
              className="fill-[oklch(0.7_0.008_286)] text-[11px] font-semibold"
            >
              {feature.label}
            </text>
            <text
              x={textX}
              y={elbow[1] + 15}
              textAnchor={anchor}
              className="text-[17px] font-bold"
              style={{ fill: color }}
            >
              {feature.score}
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}
