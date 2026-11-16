// Switch for legacy SHA-256 password hashes. ON: any account that still has a legacy hash is rejected at
// login and sent down the "Account required password reset" path (HTTP 400). Its hash is not upgraded.
// Accounts with a bcrypt hash sign in as normal, and the forgot-password and reset-password flow does not
// need the old hash, so a rejected account recovers by resetting its password.
// Set to false to let legacy accounts sign in again and be upgraded to bcrypt on their next successful login.
export const REJECT_LEGACY_PASSWORD_HASHES = true;
