// Prisma seed file.
//
// Hedera Cyclops does not rely on seeded application data: NFT metadata and
// ownership come from the Hedera Mirror Node, and holder-gated content is
// created by users after signing in. This file exists only so `npx prisma db
// seed` has a valid entry point. If you ever need bootstrap data (e.g. test
// accounts), add it here — but never commit real wallet addresses or secrets.

async function main() {
  // eslint-disable-next-line no-console
  console.log('No seeded data required. Collection data is read from mainnet.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
