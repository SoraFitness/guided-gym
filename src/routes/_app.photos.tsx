import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/photos")({
  head: () => ({ meta: [{ title: "Progress Pictures — Ascendr" }] }),
  component: PhotosLayout,
});

function PhotosLayout() {
  return <Outlet />;
}
