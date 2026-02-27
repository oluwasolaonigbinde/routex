import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export async function hashData(data: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(data, saltRounds);
}

export async function compareHash(plainText: string, hash: string) {
    return await bcrypt.compare(plainText, hash);
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export function encrypt(plaintext: string, key: string): string {
    const KEY = Buffer.from(key, 'base64');

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

    const ciphertext = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decrypt(payload: string, key: string): string {
    const data = Buffer.from(payload, 'base64');
    const KEY = Buffer.from(key, 'base64');

    const iv = data.subarray(0, IV_LENGTH);
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]).toString('utf8');
}

export function convertTo2DecimalPlaces(amount: number): number {
    return Math.round(amount * 100) / 100;
}
