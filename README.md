# Kin

Kin is a Telegram-first family assistant for household group chats.

## MVP backend model

- One `Family` = one household account
- One owner/admin `User` per family in v1
- One `Assistant` provisioned per family
- One shared Kin Telegram bot for the whole product
- One `GroupBinding` per household Telegram group
- One `OnboardingState` that moves setup into Telegram group binding

This MVP does **not** use a per-family WhatsApp-style login/session model. The core channel object is the Telegram group binding.

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

## Environment

Expected env vars include:
- `DATABASE_URL`
- `KIN_TELEGRAM_BOT_USERNAME` (optional, used for Telegram deep links)
- `KIN_TELEGRAM_WEBHOOK_SECRET` (required for trusted Telegram binding completion callbacks)

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

## Next backend work

- wire the actual Telegram bot/webhook service to call the binding completion endpoint
- decide whether MVP should keep the three-step `DM_STARTED` -> `BOT_ADDED` -> `ACTIVE` model or collapse steps
- make `DATABASE_URL` handling less brittle for local builds and non-DB routes
- add real auth/session protection before public exposure
