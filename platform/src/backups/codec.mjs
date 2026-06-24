const encoder = new TextEncoder();
const decoder = new TextDecoder();
const AAD = encoder.encode("maxxed-platform-backup-v1");

function decodeKey(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43,44}$/.test(value)) {
    throw new Error("invalid_backup_encryption_key");
  }
  const bytes = new Uint8Array(Buffer.from(value, "base64url"));
  if (bytes.byteLength !== 32) throw new Error("invalid_backup_encryption_key");
  return bytes;
}

async function importKey(value) {
  return crypto.subtle.importKey("raw", decodeKey(value), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function sha256Hex(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function encryptBackupSnapshot(snapshot, encryptionKey) {
  const plaintext = encoder.encode(JSON.stringify(snapshot));
  const plaintextSha256 = await sha256Hex(plaintext);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const key = await importKey(encryptionKey);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({
    name: "AES-GCM",
    iv: nonce,
    additionalData: AAD,
    tagLength: 128,
  }, key, plaintext));
  const envelope = {
    version: 1,
    algorithm: "AES-256-GCM",
    createdAt: snapshot.createdAt,
    nonce: Buffer.from(nonce).toString("base64url"),
    plaintextSha256,
    plaintextBytes: plaintext.byteLength,
    ciphertext: Buffer.from(ciphertext).toString("base64url"),
  };
  return {
    bytes: encoder.encode(JSON.stringify(envelope)),
    plaintextSha256,
    plaintextBytes: plaintext.byteLength,
  };
}

export async function decryptBackupSnapshot(bytes, encryptionKey) {
  let envelope;
  try {
    envelope = JSON.parse(decoder.decode(bytes));
  } catch {
    throw new Error("invalid_backup_envelope");
  }
  if (envelope?.version !== 1 || envelope.algorithm !== "AES-256-GCM" ||
      typeof envelope.nonce !== "string" || typeof envelope.ciphertext !== "string" ||
      !/^[a-f0-9]{64}$/.test(envelope.plaintextSha256 || "")) {
    throw new Error("invalid_backup_envelope");
  }
  try {
    const key = await importKey(encryptionKey);
    const nonce = new Uint8Array(Buffer.from(envelope.nonce, "base64url"));
    const ciphertext = new Uint8Array(Buffer.from(envelope.ciphertext, "base64url"));
    if (nonce.byteLength !== 12 || ciphertext.byteLength < 16) throw new Error("invalid");
    const plaintext = new Uint8Array(await crypto.subtle.decrypt({
      name: "AES-GCM",
      iv: nonce,
      additionalData: AAD,
      tagLength: 128,
    }, key, ciphertext));
    if (plaintext.byteLength !== Number(envelope.plaintextBytes) ||
        await sha256Hex(plaintext) !== envelope.plaintextSha256) {
      throw new Error("backup_integrity_failed");
    }
    const snapshot = JSON.parse(decoder.decode(plaintext));
    if (snapshot?.version !== 1 || !snapshot.tables || typeof snapshot.tables !== "object") {
      throw new Error("invalid_backup_snapshot");
    }
    return { snapshot, plaintextSha256: envelope.plaintextSha256 };
  } catch (error) {
    if (["invalid_backup_encryption_key", "backup_integrity_failed", "invalid_backup_snapshot"].includes(error.message)) {
      throw error;
    }
    throw new Error("backup_decryption_failed");
  }
}
