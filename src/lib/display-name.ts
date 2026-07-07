/** Extracts the serial portion of a Hedera account id (e.g. "0.0.1234" -> "1234"). */
export function walletSerial(address: string): string | null {
  const parts = address.split('.');
  return parts.length === 3 ? parts[2] : null;
}

/** Short, obfuscated wallet address for compact UI spaces. */
export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

const AUTO_USERNAME_PATTERN = /^User \d+$/i;

/** Default display name: the full wallet address when no username is set.
 *  Also treats legacy auto-generated "User <number>" names as unset so existing
 *  DB rows display the wallet without needing a migration. */
export function userDisplayName(username: string | null | undefined, walletAddress: string): string {
  if (username && !AUTO_USERNAME_PATTERN.test(username.trim())) return username;
  return walletAddress;
}
