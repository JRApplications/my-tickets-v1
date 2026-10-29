// Switch for legacy SHA-256 password hashes. OFF by default: legacy accounts can still sign in and are
// upgraded to bcrypt on their next successful login. Set to true to reject any account that still has a
// legacy hash; it is then sent down the "Account required password reset" path.
export const REJECT_LEGACY_PASSWORD_HASHES = false;
