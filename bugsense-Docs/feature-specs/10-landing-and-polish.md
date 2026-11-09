# 10 Landing Page and Final Polish

## Landing Page (public `/`)
- Sections: product-focused hero, feature grid, issue workflow, keyboard-shortcut showcase, FAQ, and account creation CTA.
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

## Resume Assets
- README: badges, product screenshots, features, architecture diagram, technical decisions, local setup, and API docs link.
- 3-4 bullet points ready for resume (impact oriented, e.g. "Built AI triage using Groq JSON output to speed up issue creation").

## Commit Plan
Separate verified conventional commits per step (see `ai-workflow-rules.md` section 4): backend models/API, tests, frontend hooks, UI, tracker update. Commit only after each step passes lint, tests and manual verification.
