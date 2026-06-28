# Handoff: MyCounselor — Visual Identity & Component System

A complete visual language for the MyCounselor school-counseling app, built on the **Pathfinder** compass mark. Calm, trustworthy, modern, with a warm human touch.

---

## ▶ How to use this with Claude Code

1. **Copy this folder into your repo**, e.g. `mycounselor-app/design/`.
2. **Drop `tokens.ts`** into your theme/constants folder (e.g. `src/theme/tokens.ts`). It's a framework-agnostic object — works with RN `StyleSheet`, styled-components, or NativeWind.
3. **Install the fonts** (Expo):
   ```bash
   npx expo install @expo-google-fonts/manrope @expo-google-fonts/public-sans expo-font
   ```
   Load `Manrope_500Medium / _700Bold / _800ExtraBold` and `PublicSans_400Regular / _500Medium / _600SemiBold / _700Bold` at app startup.
4. **Add the logo assets** from `assets/` to your app (app icon, in-app logo).
5. **Open Claude Code in the repo root** and prompt it. A good starting prompt:

   > Read `design/README.md` and `design/tokens.ts`. We're restyling the MyCounselor app to this visual system — **keep all existing navigation, screens, and data/Supabase logic**; only change the look.
   > Work in this order: (1) wire `tokens.ts` into our theme and replace the old navy `#1e40af` with `colors.primary`; (2) restyle the shared components — Button, Card, StatusBadge, Avatar, Input, TabBar, send button, unread badge, spinner, empty state — to match the specs in the README; (3) then apply across screens. Use our existing component library and patterns; don't add new dependencies beyond the fonts.

6. Reference the **standalone HTML files in `reference/`** (double-click to open in a browser) to see the exact intended look while implementing.

> **Note:** the old primary `#1e40af` is replaced everywhere by `#1E73CE` (warmer, slightly teal-leaning, friendlier for a school setting). The deep navy `#14306B` is kept only for the wordmark and occasional dark headers.

---

## About the design files

The files in `reference/` are **design references created in HTML** — prototypes that show the intended look, not production code to copy line-for-line. The task is to **recreate them in your existing React Native environment** using your established components, navigation, and styling patterns. The `.dc.html` source uses inline styles, so every value is readable directly; the bundled `.html` files render in any browser.

**Fidelity: High.** Final colors, typography, spacing, radii, and component states. Recreate the UI faithfully using your codebase's libraries.

---

## Design tokens

### Color

| Token | Hex | Use |
|---|---|---|
| `primary` | `#1E73CE` | Main actions, active tab/icon, links, focus |
| `primaryPressed` | `#155CAC` | Hover / pressed |
| `primaryTint` | `#E2EEFB` | Tinted fills, icon chips, "In Progress" bg |
| `navy` | `#14306B` | Wordmark, deep headers |
| `teal` | `#199FB0` | Avatar hue; subtle accents |
| `coral` | `#E0785A` | AI Counselor + warm accents (sparingly) |
| `danger` | `#E5483B` | Destructive (reject / delete) |
| `ink900` | `#17233D` | Titles / primary text |
| `ink700` | `#36425A` | Body text |
| `muted500` | `#64728A` | Secondary text |
| `faint400` | `#95A2B6` | Captions, placeholders, inactive icons |
| `border` | `#E6EBF2` | Card & input borders |
| `borderSoft` | `#EEF2F8` | Dividers |
| `canvas` | `#F4F7FB` | App background |
| `card` | `#FFFFFF` | Card / surface |
| `dark` | `#0E1A33` | Dark surfaces / splash |

**Status** (badge `{ bg, text, dot }`):
- Pending — bg `#FBEFD6`, text `#9A6A12`, dot `#E2A437`
- In Progress — bg `#E2EEFB`, text `#1A63B8`, dot `#2C7FD6`
- Approved — bg `#DCF1E6`, text `#1B8A54`, dot `#27A869`
- Closed — bg `#EAEEF4`, text `#5C6B82`, dot `#94A3B8`

**Avatar palette** (saturated bg + white initials, hue hashed from name):
`#2C7FD6` `#199FB0` `#E0785A` `#7C6CD6` `#27A869` `#E2A437` `#5C6B82`

### Typography

Two families: **Manrope** (display, headings, wordmark, buttons) + **Public Sans** (body, labels, UI).

| Role | Family / Weight | Size | Line | Tracking |
|---|---|---|---|---|
| Screen title | Manrope 800 | 28 | 30 | -0.02em |
| Section heading | Manrope 700 | 20 | 26 | -0.01em |
| Card title | Manrope 700 | 17 | 22 | 0 |
| Body | Public Sans 400 | 15 | 22 | 0 |
| Body strong | Public Sans 600 | 15 | 22 | 0 |
| Secondary | Public Sans 500 | 13 | 19 | 0 |
| Caption / meta | Public Sans 500 | 12 | 16 | 0 |
| Eyebrow label | Public Sans 700 | 12 | 14 | 0.14em · UPPERCASE · `faint400` |
| Button | Manrope 700 | 15 | 18 | 0 |
| Tab label | Public Sans 700 (active) / 600 (inactive) | 11 | 13 | 0 |

### Spacing — base 4
`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40`

### Radius
chip `6` · button/input `9` · card `12` · panel `14` · sheet `16` · pill `999` · avatar/FAB `50%`

### Shadows (soft) — see `tokens.ts` for RN `shadow*`/`elevation` objects
- card: `0 1px 2px rgba(20,40,80,.05)`
- raised/popover: `0 6px 18px rgba(20,40,80,.10)`
- primary button: `0 6px 16px rgba(30,115,206,.28)`
- FAB / send: `0 8px 18px rgba(30,115,206,.34)`
- destructive: `0 6px 16px rgba(229,72,59,.24)`

---

## Logo & app icon

The **Pathfinder** mark: an open compass ring that reads as a "C" (Counselor), with a heavier blue arc sweeping up and over a lighter **blue** tail (the road travelled), resolving at a marker dot to the east (the heading). It doubles as a lowercase "c".

**Lockup:** mark + wordmark, gap ≈ 0.3× mark height. Wordmark is "My" in Manrope 500 `#6B7A99` + "Counselor" in Manrope 800 `#14306B` (use white on dark). Letter-spacing -0.03em.

**Assets in `assets/`:**
- `logo-symbol.svg` — full-color mark (deep + light two-tone blue)
- `logo-symbol-mono.svg` — single-color (`currentColor`), tint to any color
- `app-icon.svg` — 1024×1024 full-bleed app icon (blue field, white two-tone mark); OS masks the corners

**Clear space:** keep at least 0.5× mark height clear on all sides. Minimum symbol size 24px. Don't recolor the arc, rotate, add effects, or stretch.

---

## Components

All cards/surfaces: `card` bg, `1px border` color `border`, radius `card (12)`, `shadows.card`.

### Buttons (height ~46, padding 13×24, radius 9, label Manrope 700/15)
- **Primary** — bg `primary`, white text, `shadows.primaryButton`. Pressed: `primaryPressed`.
- **Secondary** — white bg, `primary` text, `1.5px` border `#CFE0F4`.
- **Destructive** — bg `danger`, white text, `shadows.danger`.
- **Disabled** — bg `#EAEEF4`, text `#A6B1C2`, no shadow, not pressable.
- **New request** — bg `primary`, white text, leading `+` icon (a primary action).

### Send button
Circular 48 (FAB 52), bg `primary`, white paper-plane icon, `shadows.fab`.

### Floating action button (FAB)
Circular 52, bg `primary`, white `+`, bottom-right, `shadows.fab`.

### Status badge
Pill (radius 999), padding 5×11, `700/12` text. Leading 7px dot. Colors per status table.

### Avatar
Circle, bg = `getAvatarColor(name)`, white initials in Manrope 700 (size ≈ 0.34× diameter). Sizes 56 / 44 / 36 / 28.

### Input
Border `1.5px` `border`, radius 9, padding 12×14, text `15` `ink900`, placeholder `faint400`. Label above: Public Sans 600/13 `ink700`, 7px gap. **Focus:** border `primary` + 3px ring `rgba(30,115,206,.12)`. Multiline: same, min-height ~70, top-aligned.

### Cards
- **Request card** — title (Manrope 700/16) + status badge top-right; description (Public Sans 13.5, `muted500`); footer divider (`borderSoft`) with category + relative time (`faint400`).
- **Conversation row** — avatar 44 + name (Manrope 700/14) + last-message preview (truncated, `muted500`); right column: timestamp (`faint400` 11) + unread badge.

### Unread badge
Min 18–20px pill, padding 0×5–6, `700/10–11` white text. Message unread uses `coral`; count chips use `primary`. On an icon, position top-right with a 2px white ring.

### Bottom tab bar (Student: Dashboard · AI Counselor · Profile)
White bg, top hairline `borderSoft`, ~64–72 tall + safe area. Each tab: 24px icon over 11px label, centered. **Active:** `primary`, icon stroke 2.0, label 700. **Inactive:** `#94A3B8`, icon stroke 1.9, label 600.

### Feedback
- **Spinner** — 34px ring, 3px track `primaryTint`, top arc `primary`, spin 0.8s linear.
- **AI typing** — three 7px muted-gray (`#94A3B8`) dots in a received-style bubble, staggered bounce (1.2s, delays 0 / .18 / .36s).
- **Empty state** — centered: 58px circle `primaryTint` with a `primary` line icon, title (Manrope 700/16), subtitle (Public Sans 13 `muted500`, max ~280), optional primary button.

### Iconography
Line icons, 24px grid, **1.9px stroke**, round caps & joins, no fill (except compass needle / arrows). Inactive `muted500`/`faint400`, active `primary`.

---

## Interactions & states

- **Pressable feedback:** filled buttons darken to their `*Pressed` shade; cards/rows use a subtle `canvas` overlay or 0.7 opacity.
- **Input focus:** animate to `primary` border + ring.
- **Navigation:** active tab color + weight change as above; AI Counselor tab can show a small `coral` presence dot when AI is online.
- **Loading:** full-screen spinner uses the spinner spec centered on `canvas`.
- **Validation:** error border `danger`, helper text Public Sans 500/12 `danger` below the field.

---

## Files

```
design_handoff_mycounselor_identity/
├── README.md                 ← this file (self-sufficient spec)
├── tokens.ts                 ← design tokens (colors, type, spacing, radius, shadows, avatar helpers)
├── assets/
│   ├── logo-symbol.svg       ← full-color Pathfinder mark
│   ├── logo-symbol-mono.svg  ← single-color (currentColor)
│   └── app-icon.svg          ← 1024² app icon
└── reference/
    ├── MyCounselor-Foundation.html      ← full system (open in browser)
    └── MyCounselor-Pathfinder-Logo.html ← logo showcase
```

Source `.dc.html` prototypes live in the project root and contain the exact inline styles for every component.
