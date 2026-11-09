# UI / UX Context: Premium Design System

**Bar to hit:** Linear + Vercel + Notion level craft. Calm, dense-but-airy, fast, delightful. Never generic admin-template looking.

## 1. Design Principles
1. **Speed is a feature**: optimistic updates, instant navigation, skeleton loaders (no blocking spinners).
2. **Keyboard first**: `Cmd/Ctrl+K` palette, `C` create issue, `/` search, `G then B` board, `?` shortcuts help.
3. **Clarity over decoration**: strong hierarchy, generous whitespace, restrained color.
4. **Delight in details**: micro-interactions, smooth transitions, thoughtful empty states.
5. **AI feels native**: a subtle sparkle motif and violet accent for anything AI-powered, always editable.

## 2. Brand and Color Tokens
Define as CSS variables (HSL) and map in Tailwind. Light / Dark.

| Token | Light | Dark |
|---|---|---|
| `--background` | #FFFFFF | #0B0B0F |
| `--surface` | #F7F7F9 | #121218 |
| `--surface-elevated` | #FFFFFF | #181820 |
| `--border` | #E6E6EC | #24242E |
| `--text` | #111118 | #F2F2F7 |
| `--text-muted` | #6B6B7B | #9A9AAE |
| `--primary` (indigo) | #5B5BD6 | #7C7CF0 |
| `--ai` (violet gradient) | #8B5CF6 to #EC4899 | same |
| `--success` | #16A34A | #34D399 |
| `--warning` | #D97706 | #FBBF24 |
| `--danger` | #DC2626 | #F87171 |

Priority colors: urgent = red, high = orange, medium = yellow, low = slate.
Status colors: backlog = slate, todo = blue, in_progress = amber, in_review = violet, done = green, closed = gray.

## 3. Typography
- UI font: **Inter** (variable). Mono: **JetBrains Mono** (issue keys, code).
- Scale: 12 / 13 / 14 (base) / 16 / 20 / 24 / 32. Tight tracking on headings (-0.02em).
- Weights: 400 body, 500 labels, 600 headings.

## 4. Spacing, Radius, Elevation
- 4px base grid. Common gaps: 4, 8, 12, 16, 24, 32.
- Radius: 6 (inputs/buttons), 10 (cards), 14 (modals).
- Shadows: subtle, layered (`0 1px 2px rgba(0,0,0,.05), 0 8px 24px rgba(0,0,0,.06)`); in dark mode rely on borders + faint glow.
- Borders 1px, low contrast. Glassmorphism only on command palette and modals (backdrop-blur-xl).

## 5. Motion
- Duration 150-250ms, `cubic-bezier(0.22, 1, 0.36, 1)`.
- Page transitions: fade + 4px translate. Lists: staggered fade-in (30ms). Drag: lift with shadow and 2deg tilt.
- Use Framer Motion `layout` for board reordering. Respect `prefers-reduced-motion`.

## 6. App Layout
```
+----------+--------------------------------------------+
| Sidebar  |  Topbar: breadcrumb | search | AI | avatar   |
| 240px    +--------------------------------------------+
| collapsible|  Content (max-w 1400, padded 24)          |
+----------+--------------------------------------------+
```
- Sidebar: workspace switcher, Dashboard, My Issues, Projects (list), Settings. Collapses to icons; becomes a drawer on mobile with bottom nav.
- Issue detail opens as a **right-side panel** (peek) or full page (deep link), both supported.

## 7. Key Screens
1. **Landing/Marketing**: product-focused hero, feature overview, workflow, and clear account creation CTA.
2. **Auth**: split layout, form left, animated gradient/product preview right.
3. **Dashboard**: KPI cards (open, critical, resolved this week, avg resolution time), trend area chart, status donut, workload bar chart, recent activity.
4. **Board**: columns by status, cards with key, title, priority icon, labels, avatar. Drag and drop, quick-add at column bottom, WIP count.
5. **List view**: dense table, inline editable cells, grouping, multi-select bulk actions, saved filters.
6. **Issue detail**: title (inline edit), markdown description, properties sidebar, AI summary card, similar issues, comments, activity timeline.
7. **Create issue modal**: "Describe the bug" magic textarea -> AI Triage fills fields with a shimmer reveal; duplicate warning banner.
8. **Settings**: profile, project members/roles, labels, appearance.
9. **Command palette**: search issues, jump to project, run actions, toggle theme.

## 8. Component Patterns
- **Buttons**: primary, secondary, ghost, destructive, AI (gradient border). 32/36/40px heights. Loading state keeps width.
- **Inputs**: floating focus ring (2px primary/30%), inline validation messages.
- **Badges**: pill with dot for status; icon-only for priority with tooltip.
- **Avatars**: initials fallback with deterministic colors; stacked group with +N.
- **Tables/cards**: hover highlight, row actions appear on hover.
- **Toasts** (sonner): bottom-right, undo action on destructive changes.
- **Skeletons** match final layout exactly. **Empty states**: illustration/icon, one-line explanation, primary CTA.

## 9. AI UX Language
- Entry points: sparkle button in create modal, "Summarize" on issue, "Find similar".
- Loading: animated gradient shimmer + "Analyzing your report..."
- Result: fields appear with a staggered highlight; each has "accepted by default, tap to edit"; a confidence chip (e.g. "High confidence").
- Error: "AI is taking a break. Fill in manually" with retry.
- Always label: "Suggested by AI" with a small sparkle icon.

## 10. Responsiveness
Breakpoints: 375 (mobile), 768 (tablet), 1024, 1440. Board scrolls horizontally with snap on mobile; tables collapse to cards.

## 11. Accessibility
WCAG AA contrast, visible focus rings, ARIA for dnd (announce moves), labels on icon buttons, full keyboard operation, semantic landmarks.

## 12. Quality Gate (every screen)
- [ ] Light and dark verified
- [ ] Loading / empty / error states
- [ ] Mobile layout checked
- [ ] Keyboard and focus order
- [ ] No layout shift; fonts preloaded
- [ ] Feels fast (<100ms interaction response)
