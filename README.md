# AllWork (working name)

**Any Work. Any Skill. Any Person. One Platform.** — a universal work, hiring and collaboration marketplace.
*“Your Skills Should Never Go Unused.”*

## Quick start

Requirements: Node 22+, PostgreSQL 15+.

```bash
npm install
cp .env.example .env           # set DATABASE_URL and AUTH_SECRET (openssl rand -hex 32)
npx prisma migrate dev         # create tables
npm run seed                   # demo skills, workers, client, admin, projects
npm run dev                    # http://localhost:3000
npm run test:engine            # parser + matching + first-responder allocation checks
```

Demo accounts (password `demo1234`): client `9888888888`, admin `9999999999`, workers `9000000001`–`9000000016`.

## What works today

| Area | Status |
|---|---|
| Homepage (all 14 sections, 4 pillars, AI search bar) | ✅ |
| Phone + password auth, OTP verification, JWT httpOnly sessions | ✅ (OTP in **demo mode** — code shown on screen until an SMS provider is set) |
| One account = worker + client + collaborator | ✅ |
| Worker profile: unlimited + custom skills, experience, portfolio, certifications, languages, preferences, radius, rates | ✅ |
| Post Any Work: natural language (English/Hindi/Hinglish), voice input, editable structured job | ✅ |
| AI Work Assistant | ✅ Claude (`ANTHROPIC_API_KEY`) or clearly-labelled **offline rule-based demo parser** |
| Dynamic skills/categories (never rejects a legit request) | ✅ |
| Smart matching engine (skill, location/radius, availability, experience, reliability, verification, performance, preferences) | ✅ `src/lib/matching.ts` |
| First-responder allocation with row-locked transactions, expiring holds, waitlist, re-invites, new waves, history | ✅ `src/lib/allocation.ts` |
| Worker proposals (hourly/daily/fixed + extras, date & time window) | ✅ |
| Client comparison cards with 6 sort orders, select / decline | ✅ |
| Availability calendar (weekly hours, busy slots, temporary availability, bookings) + double-booking prevention | ✅ |
| Bookings: status tracking, in-booking chat with link attachments, completion, cancellation, reviews | ✅ |
| Payments: commission, earnings, history, refunds on cancel | ✅ **test mode only** — no gateway connected |
| Live notifications (SSE) + toasts | ✅ |
| Collaborate: projects with 6 clearly-labelled compensation types, applications, accept/reject, contributor recommendations, invites | ✅ |
| Hire Talent: search, filter, sort, save/shortlist, public profiles | ✅ |
| Trust: phone/ID/skill/portfolio verification requests, ratings, reliability score, cancellation history, report user, disputes | ✅ |
| Admin: platform stats, verification queue, disputes, reports, category & matching analytics, admin log | ✅ (`/admin`) |

## Not yet integrated (next steps)

- **SMS** (MSG91/Twilio) — `src/lib/sms.ts`
- **Payment gateway** (Razorpay/Stripe) — replace the test-mode payment in `confirmAndPayAction`
- **File uploads** (S3/Blob) for profile photos, attachments, ID documents — currently links only
- **Maps/geocoding** — currently a built-in table of Indian cities + browser GPS
- **Email**, push notifications, Socket.IO/Redis for real-time at scale (SSE polling today)
- Cron: call `GET /api/cron/allocation` every minute in production (reservations also expire lazily on page loads)

## Architecture

```
src/
  app/                 Next.js App Router pages + server actions (app/actions/*)
  lib/
    ai/                extract.ts (Claude structured output) · rules.ts (offline parser) · schema.ts
    matching.ts        weighted, expandable worker scoring + dispatch waves
    allocation.ts      first-responder reservations, proposals, booking, cancellation, payments split
    auth.ts            JWT sessions (jose), requireUser / requireAdmin
    geo.ts             city coordinates + haversine
prisma/schema.prisma   relational model (users, skills, jobs, matches, reservations, proposals,
                       calendar, bookings, payments, projects, messages, notifications, trust, admin)
```
