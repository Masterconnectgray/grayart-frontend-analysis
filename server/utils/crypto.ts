import crypto from 'node:crypto';

const IV_LENGTH = 16;

function deriveKey(key: string): Buffer {
  return crypto.createHash('sha256').update(key).digest();
}

export function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', deriveKey(key), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(encrypted: string, key: string): string {
  const [ivHex, payloadHex] = encrypted.split(':');
  if (!ivHex || !payloadHex) {
    throw new Error('Payload criptografado inválido');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const payload = Buffer.from(payloadHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', deriveKey(key), iv);
  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
  return decrypted.toString('utf8');
}
