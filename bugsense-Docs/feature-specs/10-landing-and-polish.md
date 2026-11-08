# 10 Landing Page and Final Polish

## Landing Page (public `/`)
- Sections: hero (headline, subhead, CTA "Try live demo", animated product mockup), social proof/tech strip, feature grid, AI spotlight (triage demo animation), dashboard preview, keyboard-shortcut showcase, FAQ, footer.
- Smooth scroll reveal, gradient mesh background, dark/light support, SEO meta + OpenGraph image.

## Product Polish Checklist
- [ ] Consistent spacing/typography across all screens
- [ ] Loading skeletons, empty and error states everywhere
- [ ] Toasts with undo for destructive actions
- [ ] 404 and error boundary pages with personality
- [ ] Onboarding checklist for new users (create project, add issue, try AI)
- [ ] Keyboard shortcuts help modal (`?`)
- [ ] Favicon, app title, theme-color
- [ ] Lighthouse 90+ (Perf/A11y/BP/SEO); bundle analysis, route code-splitting
- [ ] Cross-browser check (Chrome, Safari, Firefox) and mobile Safari
- [ ] Demo data seeder: `python manage.py seed_demo` (1 project, 40 realistic issues, 4 users, comments)

## Resume Assets
- README: badges, live demo link, GIF/video, features, architecture diagram, tech decisions, how to run locally, API docs link.
- 3-4 bullet points ready for resume (impact oriented, e.g. "Built AI triage using Gemini structured output cutting issue creation to under 10 seconds").

## Commit Plan
Separate verified conventional commits per step (see `ai-workflow-rules.md` section 4): backend models/API, tests, frontend hooks, UI, tracker update. Commit only after each step passes lint, tests and manual verification.
