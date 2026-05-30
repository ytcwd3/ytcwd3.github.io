// Simple XOR encryption for API responses
// Not secure against determined attackers, but obscures data in Network tab
// Users can still extract data by debugging JS, but it blocks casual copying

const ENCRYPTION_KEY = "ytcwd3_secret_key_2024";

function xorEncrypt(text: string): string {
  const key = ENCRYPTION_KEY;
  const utf8Bytes = Buffer.from(text, "utf8");
  const encrypted: number[] = [];
  for (let i = 0; i < utf8Bytes.length; i++) {
    encrypted.push(utf8Bytes[i] ^ key.charCodeAt(i % key.length));
  }
  return Buffer.from(encrypted).toString("base64");
}

function xorDecrypt(encrypted: string): string {
  const key = ENCRYPTION_KEY;
  const encryptedBytes = Buffer.from(encrypted, "base64");
  const decrypted: number[] = [];
  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted.push(encryptedBytes[i] ^ key.charCodeAt(i % key.length));
  }
  return Buffer.from(decrypted).toString("utf8");
}

export function encryptData(data: any): string {
  const jsonStr = JSON.stringify(data);
  return xorEncrypt(jsonStr);
}

export function decryptData(encrypted: string): any {
  try {
    const jsonStr = xorDecrypt(encrypted);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Decryption failed:", e);
    return null;
  }
}