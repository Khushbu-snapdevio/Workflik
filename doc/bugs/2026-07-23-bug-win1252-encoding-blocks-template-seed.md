# Bug: Templates never appear — built-in seed silently fails on a WIN1252 dev database

## What's broken (user's perspective)

On a fresh local (Windows) setup, the Templates gallery (`/app/<workspace>/templates`)
shows the empty state **"No templates yet — This instance doesn't have any built-in
templates seeded yet"** even though the 18 built-in templates are supposed to
auto-seed. Clicking **"Seed default templates"** (as a platform admin) appears to do
nothing — the gallery stays empty.

## Reproduce

1. On Windows, start the app with the bundled embedded Postgres (`pnpm db:local`)
   where the machine's OS locale is a non-UTF8 codepage (e.g. `English_India.1252`).
2. Start the worker / click "Seed default templates".
3. Templates never populate.

## Root cause

The seed insert fails at the Postgres layer, not in app logic:

```
PostgresError: character with byte sequence 0xf0 0x9f 0x91 0x8b in encoding "UTF8"
has no equivalent in encoding "WIN1252"
```

`0xf0 0x9f 0x91 0x8b` is the UTF-8 encoding of 👋 — the "Getting Started" template's
icon. The bundled Postgres came from `@embedded-postgres/windows-x64`, whose
`initdb` (in [scripts/dev-db.ts](../../scripts/dev-db.ts)) was invoked **without an
encoding flag**, so on Windows it inherited the OS locale and created the cluster —
and therefore the `krova` database — with **`server_encoding = WIN1252`**
(`datcollate/datctype = English_India.1252`).

WorkFlik stores emoji throughout (template icons, page icons, block content). A
WIN1252 database physically cannot represent those code points, so every insert that
carries an emoji is rejected. The failure surfaces only as an unhandled seed error;
the gallery just stays empty.

This is not template-specific — any emoji anywhere in the app (e.g. setting a page
icon) would fail the same way. The database encoding is the real defect.

## Notes

- `client_encoding` was already `UTF8`; the incompatibility is the **server/database**
  encoding, which PostgreSQL cannot change in place (`ALTER DATABASE ... SET ENCODING`
  does not exist). The database must be recreated as UTF8.
