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
- resumes the Telegram group-binding step using the `bindingId` and `inviteToken` returned from setup

## Environment

Expected env vars include:
- `DATABASE_URL`
- `KIN_TELEGRAM_BOT_USERNAME` (optional, used for Telegram deep links)

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

- add the Telegram webhook/bot-side binding completion flow
- move `GroupBinding` from `INVITE_PENDING` → `BOT_ADDED` / `ACTIVE`
- mark onboarding complete when the Telegram group is verified
- add real auth/session protection before public exposure
