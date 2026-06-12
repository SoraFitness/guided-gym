import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PhotoAuthGate } from "@/components/photos/PhotoAuthGate";

export const Route = createFileRoute("/_app/photos")({
  head: () => ({ meta: [{ title: "Progress Pictures — Pulse" }] }),
  component: PhotosLayout,
});

function PhotosLayout() {
  return (
    <PhotoAuthGate>
      <Outlet />
    </PhotoAuthGate>
  );
}
