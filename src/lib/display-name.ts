/** Extracts the serial portion of a Hedera account id (e.g. "0.0.1234" -> "1234"). */
export function walletSerial(address: string): string | null {
  const parts = address.split('.');
  return parts.length === 3 ? parts[2] : null;
}

/** Short, obfuscated wallet address for compact UI spaces. */
export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

/** Default display name: the full wallet address when no username is set. */
export function userDisplayName(username: string | null | undefined, walletAddress: string): string {
  if (username) return username;
  return walletAddress;
}
