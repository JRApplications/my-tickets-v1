import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

export async function generateSalt(): Promise<string> {
    return bcrypt.genSaltSync(BCRYPT_ROUNDS);
}

export async function hashPassword(password: string, salt: string): Promise<string> {
    return bcrypt.hashSync(password, salt);
}

export async function verifyPassword(password: string, storedValue: string): Promise<boolean> {
    // Support legacy SHA-256 format (salt:hash) for existing accounts
    if (storedValue.includes(':') && !storedValue.startsWith('$2')) {
        return verifyLegacySha256(password, storedValue);
    }
    return bcrypt.compareSync(password, storedValue);
}

// Legacy SHA-256 verification for accounts that haven't been migrated yet
async function verifyLegacySha256(password: string, storedValue: string): Promise<boolean> {
    const separatorIndex = storedValue.indexOf(':');
    if (separatorIndex === -1) return false;
    const salt = storedValue.substring(0, separatorIndex);
    const storedHash = storedValue.substring(separatorIndex + 1);
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (hash.length !== storedHash.length) return false;
    let result = 0;
    for (let i = 0; i < hash.length; i++) {
        result |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
    }
    return result === 0;
}
