# Progress Pictures

A private photo tracker for body transformation, with gallery, before/after comparison, timeline grouping, and AI-powered comparison feedback (free for all users).

## Data & storage

New private storage bucket `progress-photos` with RLS scoped to `auth.uid()/...` path prefix (read/write/delete only own folder).

New table `public.progress_photos`:
- `id`, `user_id`, `image_path` (storage path), `photo_type` ('front'|'side'|'back'|'custom'), `weight_kg` numeric null, `taken_on` date, `notes` text null, `created_at`, `updated_at`
- RLS: users manage their own rows. GRANTs to authenticated + service_role.

Photo type is stored as a CHECK-constrained text column.

## Entry points

- **Bottom nav**: new "Photos" tab (Camera icon) → `/_authenticated/photos`
- **Progress tab**: card "Progress Pictures" with latest thumbnail, count, "View" / "Add" buttons
- **Profile tab**: row linking to `/photos`
- **Body Scan screen**: button "View progress photos" → `/photos`

## Routes (TanStack)

- `_authenticated/photos.tsx` — layout (Outlet)
- `_authenticated/photos.index.tsx` — gallery + tabs (Gallery / Timeline / Compare)
- `_authenticated/photos.new.tsx` — upload flow (camera/gallery, date, weight, notes, type)
- `_authenticated/photos.$photoId.tsx` — detail (fullscreen, edit, delete)
- `_authenticated/photos.compare.tsx` — pick two photos, side-by-side + swipe slider + AI feedback

All under `_authenticated/` so the existing auth gate applies.

## Server functions (`src/lib/progressPhotos.functions.ts`)

All use `requireSupabaseAuth`:
- `listProgressPhotos()` → rows + signed URLs
- `getProgressPhoto({ id })`
- `createProgressPhoto({ image_path, photo_type, weight_kg, taken_on, notes })` — client uploads directly to storage at `${userId}/${uuid}.jpg`, then calls this to insert row
- `updateProgressPhoto({ id, ...fields })`
- `deleteProgressPhoto({ id })` — also removes storage object
- `getSignedUploadUrl({ ext })` — returns signed upload URL + path
- `compareProgressPhotosAI({ beforeId, afterId })` — fetches both photos as signed URLs, calls Lovable AI (`google/gemini-2.5-flash`) with multimodal image_url blocks; returns encouraging structured feedback. System prompt enforces: no medical claims, no shaming, always encouraging, mention lighting/angle tips.

## UI components (`src/components/photos/`)

- `PhotoCard.tsx` — thumbnail + date + weight + type chip + notes preview
- `PhotoUploadSheet.tsx` — file/camera input, type selector, date picker, weight, notes
- `PhotoGallery.tsx` — responsive grid
- `PhotoTimeline.tsx` — grouped by Week/Month/Year (toggle)
- `PhotoCompare.tsx` — side-by-side and swipe slider (CSS clip via draggable divider); shows date/weight diff
- `EmptyPhotosState.tsx` — copy + CTA
- `PrivacyNote.tsx` — "Your progress photos are private and only visible to you."

## Upload flow

1. User picks/captures photo (HTML `<input type="file" accept="image/*" capture="environment">`).
2. Client compresses to max 1600px JPEG (browser canvas) to keep storage small.
3. Client calls `getSignedUploadUrl`, uploads to bucket directly, then `createProgressPhoto` with metadata.
4. Navigate back to gallery.

## Compare flow

1. User taps "Compare" → picks two photos (filtered by matching type recommended).
2. Side-by-side view with swipe slider toggle.
3. Shows date diff (days), weight diff (kg/lbs based on profile unit).
4. "Get AI feedback" button calls `compareProgressPhotosAI` → renders bullet feedback. Errors surface inline; 429/402 messages shown.

## Empty / error states

- Empty: "Track your transformation" + "Add Progress Photo" CTA.
- Errors: toast via `sonner`; AI failures inline.

## Out of scope (v1)

- Sharing/export
- Multi-photo carousel comparison
- Body scan integration (per user)
- Paywall / photo limits (per user)

## Design

Reuse existing dark theme + neon-green accents, rounded cards (`rounded-2xl`), shadcn primitives, lucide icons. Mobile-first.
