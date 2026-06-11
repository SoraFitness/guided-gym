export interface Workout {
  id: string;
  title: string;
  category: "Strength" | "Cardio" | "Mobility" | "HIIT";
  level: "Beginner" | "Intermediate" | "Advanced";
  minutes: number;
  kcal: number;
  description: string;
  rounds: { name: string; duration: string }[];
}

export const workouts: Workout[] = [
  {
    id: "lower-body",
    title: "Lower Body Burn",
    category: "Strength",
    level: "Intermediate",
    minutes: 20,
    kcal: 95,
    description:
      "Sculpt your legs and glutes with a focused circuit hitting quads, hamstrings, and posterior chain. Built for fat loss and strength in equal measure.",
    rounds: [
      { name: "Jumping Jacks", duration: "00:30" },
      { name: "Squats", duration: "00:45" },
      { name: "Backward Lunge", duration: "00:40" },
      { name: "Glute Bridge", duration: "00:45" },
      { name: "Wall Sit", duration: "01:00" },
    ],
  },
  {
    id: "push-pull",
    title: "Push / Pull Split",
    category: "Strength",
    level: "Advanced",
    minutes: 35,
    kcal: 220,
    description:
      "Heavy upper-body session alternating push and pull patterns to build balanced shoulder, chest, and back development.",
    rounds: [
      { name: "Push Ups", duration: "00:45" },
      { name: "Pull Ups", duration: "00:45" },
      { name: "Dips", duration: "00:40" },
      { name: "Bent Row", duration: "00:50" },
    ],
  },
  {
    id: "hiit-blast",
    title: "HIIT Blast",
    category: "HIIT",
    level: "Intermediate",
    minutes: 18,
    kcal: 240,
    description:
      "Maximum effort intervals with short rests. Designed to spike your heart rate and torch calories long after you finish.",
    rounds: [
      { name: "Burpees", duration: "00:30" },
      { name: "Mountain Climbers", duration: "00:30" },
      { name: "High Knees", duration: "00:30" },
      { name: "Plank Jacks", duration: "00:30" },
    ],
  },
  {
    id: "core-stack",
    title: "Core Stack",
    category: "Strength",
    level: "Beginner",
    minutes: 12,
    kcal: 70,
    description:
      "Slow, controlled core work for stability and posture. Perfect as a warmup or recovery-day primer.",
    rounds: [
      { name: "Dead Bug", duration: "00:40" },
      { name: "Plank Hold", duration: "00:45" },
      { name: "Bird Dog", duration: "00:40" },
      { name: "Hollow Body", duration: "00:30" },
    ],
  },
  {
    id: "mobility-flow",
    title: "Mobility Flow",
    category: "Mobility",
    level: "Beginner",
    minutes: 15,
    kcal: 45,
    description:
      "A flowing sequence to open hips, shoulders, and thoracic spine. Use before training or as an active recovery session.",
    rounds: [
      { name: "World's Greatest Stretch", duration: "01:00" },
      { name: "Cat Cow", duration: "00:45" },
      { name: "90/90 Hip Switch", duration: "00:50" },
    ],
  },
];

export const getWorkout = (id: string) => workouts.find((w) => w.id === id);
