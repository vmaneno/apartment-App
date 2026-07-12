# Apartment Management App

Accounting + operations app for small/mid-size apartment complexes —
single property or portfolio, self-managed or managed on behalf of other
owners. See `PROGRESS.md` for what's built vs. remaining.

Design brief: `https://claude.ai/code/artifact/f96b5727-cbfc-430a-b7c7-4abb35214cab`

## Stack

Next.js (App Router) + TypeScript + Tailwind, Prisma + PostgreSQL (shares
the HOA app's Supabase project, isolated in its own `apartment_pm`
schema), session-cookie auth.

## Getting started

```
npm install
npm run seed    # creates a default Organization + admin user
npm run dev
```

Seeded login: `admin` / `Admin@1234`
