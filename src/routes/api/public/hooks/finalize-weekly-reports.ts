import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/finalize-weekly-reports")({
  server: {
    handlers: {
      POST: () =>
        new Response("Weekly report finalization now runs in the Supabase Edge Function.", {
          status: 410,
        }),
    },
  },
});
