# Kin

Kin is a Telegram-first family assistant for household group chats.

## Current status

Kin is now at a usable Telegram-first onboarding + message-routing milestone.

- End-to-end onboarding works for the MVP flow:
  - signup / verify
  - household creation
  - Telegram connect step with deep link + QR
  - `/start <token>` DM linking
  - Telegram group activation
  - onboarding completion
  - duplicate-group protection
- Step 1 runtime starter exists:
  - Telegram normalize/classify/router layer
- Step 2 exists:
  - `KinEvent` ingestion pipeline
  - categorization
  - dedupe
  - `familyId` / `groupBindingId` scoping
- Step 3 exists:
  - fast OpenClaw handoff path
  - conversation context loader
  - `reply` / `no_reply` / `clarify` response contract
  - transport refactor away from local-only assumptions
  - remote-gateway transport mode using gateway URL + token

This is still an MVP. The happy path is implemented and the core runtime pieces are in place, but the system is not fully production-hardened yet.

## What Kin is

Kin is the backend and product shell for a family assistant that lives in a shared Telegram household group.

The product model is:

- onboarding starts on the web
- account + household are created in Kin
- the owner connects Kin to Telegram through a DM deep link
- the owner adds the shared Kin bot to the household group
- Kin binds that group to the household
- new Telegram events are normalized, classified, stored, and optionally handed off to OpenClaw for a fast reply

The important product choice in this MVP is that Kin is group-first, not per-user chat-session-first. The main channel object is the household Telegram group binding.

## MVP backend model

- One `Family` = one household account
- One owner/admin `User` per family in v1
- One `Assistant` provisioned per family
- One shared Kin Telegram bot for the whole product
- One `GroupBinding` per household Telegram group
- One `OnboardingState` that moves setup into Telegram group binding

This MVP does **not** use a per-family WhatsApp-style login/session model. The core channel object is the Telegram group binding.

## What was finished today

### Onboarding

- Wired the Telegram-first onboarding MVP end to end.
- Confirmed the DM deep link / QR flow works.
- Confirmed `/start <token>` in a direct message links the Telegram user to the pending household binding.
- Confirmed group activation completes onboarding.
- Added duplicate-group protection so one Telegram group cannot be bound to multiple families.

### Runtime steps

- Locked in Step 1 as the Telegram normalize/classify/router entry layer.
- Added Step 2 event ingestion through `KinEvent`, including categorization, dedupe, and household/group scoping.
- Added Step 3 fast OpenClaw handoff with context loading and a strict `reply` / `no_reply` / `clarify` output contract.
- Refactored the OpenClaw transport so Kin is no longer forced into a local-only assumption.
- Added remote gateway transport mode driven by `OPENCLAW_GATEWAY_URL` and `OPENCLAW_GATEWAY_TOKEN`.

### Production architecture

The production split is now intentionally defined:

- Kin backend = public orchestration service
- OpenClaw = private internal reasoning/session service
- both run inside the same AWS private environment / VPC
- Kin reaches OpenClaw through secure internal transport:
  - internal ALB
  - Route53 private hosted zone
  - ACM certificate
  - WSS endpoint
  - gateway token

### AWS setup completed tonight

- private hosted zone: `internal.getkin.ca`
- ACM certificate for `openclaw.internal.getkin.ca`
- internal ALB
- private subnets `a` / `b` / `c`
- healthy target group
- secure gateway health check verified through `wss://openclaw.internal.getkin.ca`

## Current backend flow

`POST /api/setup`
- validates owner + family setup input
- creates the owner user, family, assistant, onboarding state, and pending Telegram binding in one transaction
- returns the Telegram binding bootstrap payload and deep link when `KIN_TELEGRAM_BOT_USERNAME` is set

`POST /api/telegram/bindings/bootstrap`
- resumes the Telegram group-binding step using the `bindingId` and `onboardingToken` returned from setup

`POST /api/telegram/bindings/complete`
- accepts a trusted Telegram bot/backend callback
- validates `x-kin-telegram-secret` against `KIN_TELEGRAM_WEBHOOK_SECRET`
- looks up the pending binding by `onboardingToken`
- rejects Telegram groups already bound to another family
- moves a binding through `DM_STARTED` -> `BOT_ADDED` -> `ACTIVE`
- marks onboarding `COMPLETE` when the binding is confirmed
- safely returns idempotent success for repeated completion requests on the same active binding

`POST /api/telegram/webhook`
- normalizes raw Telegram updates into a small internal event shape
- classifies each update as `ignore`, `ingest_only`, `onboarding_event`, or `handoff_fast`
- persists non-ignored updates into `KinEvent`
- scopes persisted events to `familyId` / `groupBindingId` when context can be resolved
- deduplicates repeated Telegram deliveries using a stable dedupe key
- handles onboarding DM + group activation events
- sends fast-handoff candidate messages to OpenClaw and posts a Telegram reply when the result is `reply` or `clarify`

## Current architecture

At the moment, the runtime looks like this:

1. Kin receives a Telegram webhook update.
2. Kin normalizes and classifies the update.
3. Kin ingests the event into `KinEvent`, with dedupe and household/group scoping.
4. If the classifier says `handoff_fast`, Kin loads recent family/group context for that event.
5. Kin calls OpenClaw over the configured transport.
6. OpenClaw returns one of `no_reply`, `reply`, or `clarify`.
7. Kin sends the reply back into Telegram when appropriate.

The intended deployment architecture is:

- Kin is the public-facing service.
- OpenClaw is internal-only.
- Transport between them is private and authenticated.
- Session continuity is keyed by family via a stable session label.

## Important caveats

- Step 3 is real, but it is still thin. The Kin backend currently uses the `openclaw` CLI as the gateway client wrapper, even in `remote-gateway` mode. That means Kin is not yet speaking directly to the internal gateway over its own native client implementation.
- The remote gateway path is designed for production, but production hardening is still in progress around deployment, observability, retries, and failure handling.
- The webhook route currently mixes onboarding handling, event ingestion, and fast handoff in one path. That is acceptable for the MVP, but it is not the final separation of concerns.
- Current auth/session protection for the public web product is still minimal and should be tightened before wider exposure.
- The README reflects the backend and runtime state in this repo. It does not claim that every operational piece is fully automated or fully deployed.

## Environment

Expected env vars include:
- `DATABASE_URL`
- `KIN_TELEGRAM_BOT_USERNAME` (optional, used for Telegram deep links)
- `KIN_TELEGRAM_WEBHOOK_SECRET` (required for trusted Telegram binding completion callbacks)
- `TELEGRAM_BOT_TOKEN` (required for Telegram webhook replies)
- `OPENCLAW_TRANSPORT_MODE` (`local-cli`, `remote-gateway`, or `disabled`)
- `OPENCLAW_GATEWAY_URL` (required for `remote-gateway` mode)
- `OPENCLAW_GATEWAY_TOKEN` (required for `remote-gateway` mode)
- `OPENCLAW_BIN` (optional override for the `openclaw` CLI binary)

## Local dev

```bash
npm install
npm run dev
```

If Prisma client or schema changes are pending:

```bash
npx prisma generate
npx prisma migrate dev
```

## Next roadmap

- harden the production webhook + gateway deployment path end to end
- reduce operational dependence on the OpenClaw CLI wrapper from the Kin host
- separate the Telegram webhook orchestration path into cleaner runtime boundaries as the system grows
- improve auth/session protection before broader public exposure
- add better observability around ingestion, handoff failures, reply decisions, and duplicate suppression
- add tests around onboarding edge cases, transport failures, and event classification behavior
- decide whether the `DM_STARTED` -> `BOT_ADDED` -> `ACTIVE` lifecycle should stay explicit or be simplified later
