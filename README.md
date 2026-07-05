# Hedera Cyclops

An anonymous, community-first PFP project on Hedera. The NFTs are the access
key; this site is the destination - a self-contained town hall for the
collection and for retail-focused Hedera projects generally.

There are 3,333 Cyclopes, max. Launch is phased (1,500 / 1,500 / 333) but every
site feature ships now - the phasing is about mint supply, not features.

## Stack

- **Next.js 14** (App Router, TypeScript) monolith - SSR for public pages,
  client components for gated interactivity.
- **PostgreSQL** via **Prisma** ORM.
- **Socket.IO** co-located in a custom Node server (`server.js`) for live Town
  Hall updates.
- **Hedera Mirror Node** REST API for all on-chain reads (NFT ownership,
  account public keys) - no API key, server-side verified, never trusted from
  the client.
- **WalletConnect v2** (`@hashgraph/hedera-wallet-connect`) - HashPack + Kabila.
- **S3-compatible** object storage (R2 / S3 / MinIO) for image/gif uploads.
- **Tailwind CSS** + a small CRT/ASCII CSS layer, monospace throughout.

## Pages

| Route         | What it is                                                        |
| ------------- | ---------------------------------------------------------------- |
| `/`           | Town Hall home - vision copy + phase progress + live snippets     |
| `/collection` | NFT gallery by serial, trait filters, per-NFT detail             |
| `/town-hall`  | Threaded forum with image/gif upload + live likes/replies        |
| `/profile`    | Owned Cyclopes, set username + PFP, post/vouch history           |
| `/the-wall`   | Community calendar of Hedera X Spaces (recurring + one-off)      |
| `/the-ledger` | Directory of Hedera projects with one-wallet-one-vouch trust     |

Read access is open to everyone. All write actions are token-gated: a valid
sign-in-with-Hedera session **and** a live Mirror Node holdership re-check.

## Local development

```bash
# 1. Install deps
npm install --legacy-peer-deps

# 2. Configure environment
cp .env.example .env
#    edit .env - at minimum set DATABASE_URL. Leave HEDERA_TOKEN_IDS empty to
#    run in placeholder / mock mode (USE_MOCK_NFTS=true).

# 3. Set up the database
npx prisma migrate dev      # applies migrations + generates the client
npm run prisma:generate     # (run automatically by build too)

# 4. Run the dev server (Next + Socket.IO)
npm run dev                 # http://localhost:3000
```

With `HEDERA_TOKEN_IDS` empty and `USE_MOCK_NFTS=true`, the Collection and
Profile pages render a small bundled mock dataset so the whole site is
demoable without any live chain data. The moment a real token id is set in
`HEDERA_TOKEN_IDS`, the mock data is ignored and live Mirror Node queries take
over - **no code change required** for Phase 2 / Phase 3.

## Environment variables

All configuration is via environment variables - see `.env.example` for the
full annotated list. Highlights:

- `DATABASE_URL` - Postgres connection string.
- `HEDERA_NETWORK` / `NEXT_PUBLIC_HEDERA_NETWORK` - `mainnet` | `testnet` (keep
  both in sync - the client-side wallet setup needs its own public copy).
- `HEDERA_TOKEN_IDS` - comma-separated HTS token ids that gate the site.
- `MIRROR_NODE_BASE_URL` - Mirror Node REST base URL for the network.
- `IPFS_GATEWAY_URL` - gateway used to resolve `ipfs://` media.
- `AUTH_JWT_SECRET` - session signing secret (**never** commit / log).
- `OBJECT_STORAGE_*` - S3-compatible endpoint, bucket, and keys.
- `ADMIN_WALLET_ADDRESSES` - comma-separated `0.0.x` addresses with moderation.
- `TOTAL_SUPPLY` - max supply (3333), drives the placeholder states.

**Never** put a secret behind a `NEXT_PUBLIC_*` name - those ship to the
browser. Only `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
are public by design.

## Testing

```bash
npm test          # Vitest: unit + integration + component
npm run typecheck # tsc --noEmit
npm run build     # production build (also runs prisma generate)
```

Unit tests cover trust-score calculation, Mirror Node holdership logic (with
mocked `fetch` + pagination), JWT issue/verify, sanitize, and Zod request
validation. A component test covers the holder-gate UI across guest,
signed-in-non-holder, and holder states. API-route integration tests and
end-to-end wallet flows are a follow-up (see Known gaps).

> **Manual QA required:** WalletConnect signature verification cannot be fully
> mocked. Before release, manually verify sign-in against **both** HashPack and
> Kabila on the configured network.

## Known gaps / follow-ups

- **Real token ids / secrets are not set.** `HEDERA_TOKEN_IDS`, `AUTH_JWT_SECRET`,
  `OBJECT_STORAGE_*`, and `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` all need real
  values in Railway before deploy; the site runs in mock-data/placeholder mode
  until then.
- **WalletConnect sign-in needs manual QA** against HashPack and Kabila - see
  the callout above. The `signMessage` → `SignatureMap` verification path is
  implemented against the documented contract but untested against real wallets.
- **No integration/e2e tests yet** for the API routes or the full connect →
  sign-in → post/vouch/RSVP flows - only unit and one component test exist.
- **Moderation is minimal**: admins (via `ADMIN_WALLET_ADDRESSES`) can delete
  posts/events, but there's no report/flag UI yet.

## Deployment (Railway)

1. Create a Railway project, add the **PostgreSQL** plugin (provides
   `DATABASE_URL`).
2. Set every variable from `.env.example` in the Railway dashboard - never
   commit real values.
3. Railway builds with Nixpacks using the standard `package.json` scripts;
   `railway.json` runs `prisma migrate deploy` then `npm start` (the custom
   Socket.IO server) on deploy.

## Security & anonymity

- No identifying information anywhere in shipped copy, metadata, or code.
- No hardcoded secrets - every credential is env-var only.
- All gated write endpoints are rate-limited; forum content is sanitized;
  uploads are MIME-type and size validated.
- NFT ownership is never cached as a source of truth - it is re-verified live
  against Mirror Node on every gating decision (with a short TTL cache).
