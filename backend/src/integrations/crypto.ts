import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto";

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY env var is not set");
  }
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to 32 bytes (base64-encoded AES-256 key)");
  }
  return buf;
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decrypt(payload: string): string {
  const key = getEncryptionKey();
  const [ivB64, authTagB64, ciphertextB64] = payload.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Malformed encrypted payload");
  }
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

interface StatePayload {
  userId: number;
  nonce: string;
}

export function signState(payload: { userId: number }, ttlSeconds: number): string {
  const key = getEncryptionKey();
  const body: StatePayload & { exp: number } = {
    userId: payload.userId,
    nonce: randomBytes(8).toString("hex"),
    exp: Date.now() + ttlSeconds * 1000,
  };
  const bodyB64 = Buffer.from(JSON.stringify(body)).toString("base64url");
  const signature = createHmac("sha256", key).update(bodyB64).digest("base64url");
  return `${bodyB64}.${signature}`;
}

export function verifyState(token: string): { userId: number } {
  const key = getEncryptionKey();
  const [bodyB64, signature] = token.split(".");
  if (!bodyB64 || !signature) {
    throw new Error("Malformed state token");
  }
  const expectedSignature = createHmac("sha256", key).update(bodyB64).digest("base64url");
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (signatureBuf.length !== expectedBuf.length || !timingSafeEqual(signatureBuf, expectedBuf)) {
    throw new Error("Invalid state signature");
  }
  const body = JSON.parse(Buffer.from(bodyB64, "base64url").toString("utf8")) as StatePayload & { exp: number };
  if (Date.now() > body.exp) {
    throw new Error("State token expired");
  }
  return { userId: body.userId };
}
