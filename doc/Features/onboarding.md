# Onboarding

## Overview

Onboarding guides new users from account creation to their first meaningful action in WorkFlik. It runs in three stages: a setup wizard, a tooltip tour, and ongoing contextual hints. The goal is to reduce time-to-value — every step should feel purposeful, not like a chore.

---

## User Stories

- As a new user, I want a guided setup so I don't start with a blank, confusing screen.
- As a user creating a workspace, I want to set my name and role so my teammates know who I am.
- As a team lead, I want to invite teammates during onboarding so we can start collaborating immediately.
- As a solo user, I want to skip team steps and jump straight to my workspace.
- As a returning user, I want to skip onboarding entirely and go straight to my work.

---

## Stage 1 — Setup Wizard

A 4-screen guided flow shown to every new user on first login (guests invited only to specific pages skip it — see business rule 4). Can be skipped at any screen (except screen 1 — profile is required).

### Screen 1 — Profile Setup

- **Display Name** (required) — blank by default (no name is collected at magic-link sign-up)
- **Avatar** (optional) — upload image or use auto-generated initials avatar
- **Role / Title** (optional) — e.g. "Product Designer", "Founder"

CTA: `"Continue"`

---

### Screen 2 — Create or Join Workspace

Two paths:

**Create a new workspace:**
- Workspace Name (required)
- Workspace Icon (optional — emoji picker or image upload)
- Creator becomes the Admin

**Join an existing workspace:**
- Paste an invite link or enter a workspace invite code
- User joins as an Editor (the default role for invite links)

CTA: `"Create Workspace"` or `"Join Workspace"`

---

### Screen 3 — Invite Teammates

- Email input (comma-separated or one-by-one) with role selector (Editor / Viewer)
- "Add another" to add more rows
- Skip link: `"I'll do this later →"`

Invites are sent immediately. Because users sign in via magic link, the inviting user's email is already verified at this point — there is no unverified-account state to gate invites behind. Pending invites are visible in Workspace Settings → Members.

CTA: `"Send Invites & Continue"` or skip

---

### Screen 4 — Choose Starting Template

Grid of 5 built-in templates to start with:

| Template | Best for |
|----------|----------|
| Meeting Notes | Teams with recurring standups or meetings |
| Project Tracker | Database-based project and task tracking |
| Daily Journal | Daily writing and reflection |
| Team Wiki | Shared knowledge base |
| Blank Page | Start from scratch |

Selecting a template creates a page using that template in the workspace.

CTA: `"Get Started"`

---

## Stage 2 — Tooltip Tour

A 5-step interactive tour shown immediately after the wizard completes. Highlights key UI areas with a tooltip bubble and a dimmed overlay on the rest of the screen.

| Step | Target | Tooltip text |
|------|--------|-------------|
| 1 | Sidebar page tree | "Your pages live here. Create unlimited nested pages." |
| 2 | New Page button (+) | "Click here or press `Ctrl+N` to create a new page." |
| 3 | Slash command (editor) | "Type `/` anywhere in a page to insert blocks — text, images, databases, and more." |
| 4 | Search button (sidebar) | "Press `Ctrl+K` to search across your entire workspace instantly." |
| 5 | Done | "You're all set. Explore at your own pace — help is always one click away." |

- Each step has a `"Next"` and `"Skip Tour"` button
- Tour can be restarted from the Help menu (`?` button in sidebar)

---

## Stage 3 — Contextual Hints

One-time, non-blocking hint bubbles that appear the first time a user encounters a feature. Dismissed individually. Never repeated after dismissal.

| Trigger | Hint |
|---------|------|
| First time opening a database | "Switch views using the tabs above — try Board or Calendar." |
| First time using a slash command | "You can search for any block type by typing after `/`." |
| First time setting a page icon | "Click the icon to change it, or add a cover image at the top." |
| First time resolving a comment | "Resolved threads are hidden but never deleted — toggle them back anytime." |
| First time sharing a page | "Public links let anyone view this page without logging in." |

Hint state is stored per-user on the server and persists across sessions.

---

## Empty States

Shown when a workspace or section has no content yet.

**Empty Workspace (no pages):**
- Headline: `"Your workspace is ready"`
- Sub-message: `"Create your first page or start from a template."`
- Buttons: `"New Page"` / `"Browse Templates"`

**Empty Sidebar Section (no favorites):**
- Sub-message: `"Pages you star will appear here."`

**Empty Database (no entries):**
- Message: `"No entries yet. Click + to add the first one."`

---

## Re-entry Paths

Users who dismissed the tour can return to onboarding resources via:
- `?` Help button in sidebar bottom → `"Start tour again"` option
- `?` Help button → `"Keyboard shortcuts"` reference
- `?` Help button → `"Browse templates"`

---

## Analytics Events

These events are sent to the **product analytics service** configured in `lib/analytics/` (e.g. PostHog or Plausible — choose and configure before building). They are **not** stored in the WorkFlik PostgreSQL database; there is no `analytics_events` table. The `lib/analytics/` module wraps the chosen provider so all call sites are provider-agnostic — swapping providers requires changing only that module.

| Event | Trigger |
|-------|---------|
| `onboarding_started` | User lands on wizard screen 1 |
| `onboarding_profile_completed` | Screen 1 submitted |
| `onboarding_workspace_created` | Workspace created |
| `onboarding_workspace_joined` | Invite link used |
| `onboarding_invites_sent` | At least one invite sent |
| `onboarding_invites_skipped` | Screen 3 skipped |
| `onboarding_template_selected` | Template chosen |
| `onboarding_completed` | Screen 4 CTA clicked |
| `tour_started` | Tooltip tour step 1 shown |
| `tour_completed` | Tour step 5 completed |
| `tour_skipped` | "Skip Tour" clicked at any step |

---

## Data Model

```
User (additions for onboarding)
├── onboarding_completed    (boolean, default: false)
├── onboarding_step         (integer — last completed step, 0–4)
└── tour_completed          (boolean, default: false)

UserHintState
├── id                      (uuid, primary key)
├── user_id                 (foreign key → User)
├── hint_key                (string — e.g. "database_view_tour")
└── dismissed_at            (timestamp)
```

---

## API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| PATCH | `/api/user/onboarding` | Update onboarding step / completion state | Authenticated |
| GET | `/api/user/hints` | Get dismissed hint keys | Authenticated |
| POST | `/api/user/hints/:key/dismiss` | Mark a hint as dismissed | Authenticated |
| GET | `/api/templates?kind=built-in` | List built-in templates for Screen 4 template picker | Authenticated |

---

## UI Screens

| Screen | Route | Access |
|--------|-------|--------|
| Onboarding Wizard | `/onboarding` | Authenticated, new user |
| Tooltip Tour | Overlay on `/[workspace]` | Authenticated, after wizard |

---

## Business Rules

1. The onboarding wizard is shown only once — on the user's first login after sign up.
2. Screen 1 (Profile Setup) cannot be skipped — a display name is required.
3. Screens 2–4 can each be individually skipped.
4. A workspace is required to access the product — a user with no workspace membership is redirected to the wizard. **Exception:** a guest (a user who holds guest page permissions but is not a member of any workspace) bypasses the wizard entirely and is taken straight to the shared page they were invited to.
5. Rejoining the same workspace via invite link after removal is not allowed without a new invite.
6. Tooltip hints are per-user — completing the tour on one device marks it done on all devices.
7. Contextual hints are never shown again after dismissal, even if the user clears their browser cache.
8. Analytics events fire regardless of whether the user completes or skips each step.

---

## Out of Scope (MVP)

- Product-led growth in-app flows (upsell nudges during onboarding)
- Video or interactive demo mode
- Onboarding checklist widget (persistent task list in sidebar)
- Per-role onboarding (different flows for Admin vs Editor)
- Team onboarding analytics dashboard
