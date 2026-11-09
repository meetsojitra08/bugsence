# 01 Authentication

## Goal
Secure JWT auth with a beautiful onboarding experience.

## User Stories
- As a visitor, I can sign up with name, email, password.
- As a user, I can log in, stay logged in, and log out.
- As a user, I can edit my profile and change my password.

## Backend
- Custom `User` (email as username, UUID pk, `full_name`).
- Endpoints: `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` (blacklist), `GET/PATCH /users/me`, `POST /users/me/change-password`.
- Password validators on; throttle auth endpoints (e.g. 10/min/IP).
- Login errors are generic (no email enumeration).

## Frontend
- Pages: `/login`, `/register`; split layout with animated gradient + product preview.
- Zod validation; password strength meter; show/hide password.
- Axios client with interceptor: attach access token, on 401 call refresh once, then retry or redirect to login.
- `AuthProvider` + `ProtectedRoute`. Preserve intended URL after login.

## Acceptance Criteria
- Invalid credentials show friendly inline error.
- Token refresh is silent; logout clears state and blacklists refresh token.
- Protected pages redirect unauthenticated users.
- Fully keyboard accessible; works in light and dark.

## Tests
Register duplicate email, login success/fail, refresh rotation, blacklisted token rejected, `users/me` requires auth.

## Commit Plan
Separate verified conventional commits per step (see `ai-workflow-rules.md` section 4): backend models/API, tests, frontend hooks, UI, tracker update. Commit only after each step passes lint, tests and manual verification.
