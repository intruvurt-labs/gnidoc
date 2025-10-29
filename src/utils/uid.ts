import * as Crypto from 'expo-crypto';

export async function sha256Hex(input: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
}

export async function generateId(): Promise<string> {
  // 8 random bytes → 16 hex chars
  const randomBytes = await Crypto.getRandomBytesAsync(8);
  const randomHex = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
  const timestamp = Date.now().toString(36);
  return `${timestamp}-${randomHex}`;
}
