import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    // Re-opening a tab within half a minute reuses what was just fetched
    // instead of showing a spinner again.
    defaultOptions: { queries: { staleTime: 30_000 } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Fetch a screen's code as soon as a link is touched or hovered.
    defaultPreload: "intent",
  });

  return router;
};
