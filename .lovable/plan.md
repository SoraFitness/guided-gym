## Paywall Reorganization Plan

Edit `src/routes/paywall.tsx` only. No logic, pricing, or subscription store changes.

### New vertical order

```text
1. Header (logo + PULSEFIT PRO + premium badge)
2. Headline + short subhead ("Unlock Your Best Body")
3. Pricing options  ← moved up
   - Yearly $49.99/year  (preselected, "BEST VALUE · SAVE 90%" badge, neon ring)
   - Weekly $9.99/week
4. Premium benefits  ← moved below pricing
   - Personalized workout plans
   - 3D exercise guidance & full library
   - Smart nutrition tracking
   - Progress & strength analytics
   - AI body scan insights
   - Faster results with guided structure
5. Free vs Premium comparison chart  ← new
6. Sticky CTA: "Unlock Premium" → subscribe(selectedPlan) → /home
7. Footer: Restore Purchases · Terms · Privacy · "Cancel anytime" · Apple subscription disclaimer
```

### Comparison chart

New `ComparisonTable` section inside the same file. Two-column table with a neon-accented Premium column.

| Feature | Free | Premium |
|---|---|---|
| Basic workouts | Yes | Yes |
| Personalized workout plans | — | Yes |
| 3D exercise demos | Limited | Full access |
| Nutrition tracking | Basic | Advanced |
| Progress tracking | Basic | Advanced analytics |
| Body scan insights | — | Yes |
| Premium tools | — | Yes |
| Guided structure & coaching | Limited | Yes |

Styling: dark card, subtle border, sticky-ish header row, neon-green check icons for Premium, muted dash / `X` for missing Free items, "Premium" column header tinted with the existing primary/neon token and a soft glow.

### Styling rules

- Reuse existing dark bg, neon accent, ambient glow, plan card, and badge styles already in `paywall.tsx`.
- No new color literals — use existing tokens.
- Mobile-first spacing: generous vertical rhythm between the 5 main blocks so the screen doesn't feel cramped.
- Keep social proof (avatars + stars) — collapse it into a thin row directly under the headline so the pricing still lands above the fold on tall phones.

### Untouched

- `subscribe()`, `PLAN_PRICES`, restore/cancel handlers, route path, onboarding → paywall redirect.
- No free-trial copy anywhere.
- No changes to `src/lib/subscription.ts` or other routes.

### Verification

- Visit `/paywall` in preview: order matches spec, Yearly preselected, switching to Weekly updates CTA target, "Unlock Premium" calls `subscribe` then navigates to `/home`, comparison table renders cleanly on mobile width, no console errors.
