# BugSense Implementation Review

Most of the redesign is built. The Today, Inbox, Capture, issue detail, four-column Board, invites, integrations and landing page all match the plan. Your trust bugs are mostly fixed on the screens I can see. What's left is a handful of visible bugs, a few things that need verifying, and some gaps between what the landing page promises and what the app shows. I've only seen static and empty states, so I can't judge the logic yet.

## What's working

- The landing page now has the new headline, a looping paste → triaged → assigned demo, a before/after block, three benefits, and a no-signup demo.
- Blue is now the brand color. Red is reserved for urgent and destructive actions.
- All screens share one page width, and "Workspace → Project" naming is consistent.
- The Inbox is a two-pane view with source badges, a duplicate chip, a triager and keyboard hints.
- The locked-email explanation, the shortcut labels (Ctrl instead of "Cad"), the password show toggle and the notification matrix are all in place.
- The Board has four columns that fit the screen, with PR chips and distinct priority shapes.

## Visible bugs to fix first

1. **"3 news in Inbox"** on Today should read "3 new."
2. **"just now ago"** appears in the Inbox preview and the issue header.
3. **Issue key wraps** ("DM3979-" / "1") in the @mentioned row on Today.
4. **Branch name cut mid-word** ("…timestamp-inst"). Truncate at a word boundary.
5. **Wrong attribution:** DM3979-8 came from Elena by email, but the activity log says "Alex Chen created this issue." It should say "Received via email from Elena."
6. **Icon collision:** Urgent (red circle-!) and Improvement (amber circle-!) use the same shape, so they differ only by color.
7. **Slack notification boxes are ticked** while Slack is Off. Gray them out until it's connected.
8. **No "Forgot password?"** link on the login page.
9. **Redundant filters on Issues:** "Overdue" appears both as a saved view and as a chip. The status chips also lack "Inbox," although three issues have that status.
10. **Three names for one action:** "Capture," "Capture bug" and "New Issue." Pick one.
11. **Random project keys** like `DM3979`. Derive the key from the project name (ACME or CHK) and let people edit it at creation.

## Screen-by-screen gaps against the plan

### Capture

- Priority defaults to Medium and reproduction details are expanded, but the plan was to leave priority blank at low confidence and collapse the details.
- The date picker is still the native `dd-mm-yyyy`, with no label and no quick options.
- "Route to: Todo (Ready)" lets a capture skip the Inbox, so I'd make Inbox the default for non-triagers.
- The empty state tells me nothing about auto-triage, duplicate warnings, confidence messaging or screenshot paste, so the after-paste screens are needed.

### Inbox

- The preview shows only the raw text. It doesn't show the AI suggestions (type, priority, labels), the confidence, or what's missing.
- "Assign to Sam" gives no reason. Add one such as "least loaded" or "fixed similar issues."
- I can't see a Merge action. It may only appear on duplicate items.

### Issue detail

- The labels (auth, checkout, performance) all show with no selected state, so it's unclear which are applied.
- There are no related or duplicate issues, and no "notify reporter" toggle.
- The due date is the native picker again.

### Board

- The "Blocking" flag from Today isn't shown on cards.
- No aging badges or inline title-add are visible. "Add issue" may still open the modal.

### Issues list

- No sorting or grouping is visible.
- A duplicate chip should appear on DM3979-7, which the Inbox flags as a possible duplicate.

### Members

- Remove has only a trash icon. Add a confirmation.
- Pending invites aren't shown, though they may appear only when one exists.

### Settings

- Timezone shows UTC. Auto-detect it from the browser.
- Avatar is a URL field. Offer an upload.
- AI settings are one checkbox. Add the confidence threshold and priority rules.

## Verify these (security and trust)

- **Webhook endpoints** look like `/integrations/github/webhook/DM3979/`, keyed only by a guessable project key. If there's no per-project secret and signature check (GitHub `X-Hub-Signature-256`, the Slack signing secret, the Sentry secret), anyone could forge a PR-merge event and close your issues. The public form and email-in need spam protection too (rate limiting, honeypot).
- **Integration setup is manual.** Users copy raw URLs and paste them into GitHub and Slack. The landing page says "built in," which is a stretch without a one-click connect.
- **Email-in** shows both an address (`bugs@dm3979.bugsense.app`) and an HTTP endpoint. Check that the address really receives mail.
- **Domain typo:** the live URLs use `bugsence-lilac.vercel.app` while the brand is BugSense. Get a proper domain before sharing.
- **Duplicate detection:** the README says it matches on titles only. The landing page says "every incoming report is checked." Match on the report body too.
- **Invented steps:** the before/after ticket lists reproduction steps the customer never gave, and it drops "Safari 17" from the environment. Label inferred steps as AI-inferred and carry the environment over.

## What's needed to finish the review

1. Capture after pasting a stack trace: the filled form, the duplicate warning, and a low-confidence state.
2. The ticket created from that capture, to confirm priority, assignee and due date match what the form showed.
3. A comment thread with an @mention, the notifications dropdown, and the Resolve-with-note dialog.
4. The Inbox with a duplicate item selected (to check for Merge).
5. A phone-width view of Inbox and issue detail.
6. Optionally a link to the webhook handler code, to check the signature verification.
