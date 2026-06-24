export class MemoryEvidenceStore {
  constructor() {
    this.objects = new Map();
  }

  async put(key, bytes, metadata = {}) {
    const body = bytes instanceof Uint8Array ? new Uint8Array(bytes) : new Uint8Array(bytes);
    this.objects.set(key, {
      body,
      contentType: metadata.contentType || "application/octet-stream",
      customMetadata: { ...(metadata.customMetadata || {}) },
      uploadedAt: new Date().toISOString(),
    });
    return { key, size: body.byteLength };
  }

  async get(key) {
    const object = this.objects.get(key);
    if (!object) return null;
    return {
      body: new Uint8Array(object.body),
      contentType: object.contentType,
      customMetadata: { ...object.customMetadata },
      size: object.body.byteLength,
    };
  }

  async delete(key) {
    this.objects.delete(key);
  }
}

export class R2EvidenceStore {
  constructor(binding) {
    if (!binding?.put || !binding?.get || !binding?.delete) {
      throw new Error("invalid_evidence_bucket_binding");
    }
    this.binding = binding;
  }

  async put(key, bytes, metadata = {}) {
    await this.binding.put(key, bytes, {
      httpMetadata: { contentType: metadata.contentType || "application/octet-stream" },
      customMetadata: metadata.customMetadata || {},
    });
    return { key, size: bytes.byteLength };
  }

  async get(key) {
    const object = await this.binding.get(key);
    if (!object) return null;
    const body = new Uint8Array(await object.arrayBuffer());
    return {
      body,
      contentType: object.httpMetadata?.contentType || "application/octet-stream",
      customMetadata: object.customMetadata || {},
      size: Number(object.size ?? body.byteLength),
    };
  }

  async delete(key) {
    await this.binding.delete(key);
  }
}

export class UnavailableEvidenceStore {
  async put() {
    throw new Error("evidence_store_unavailable");
  }

  async get() {
    throw new Error("evidence_store_unavailable");
  }

  async delete() {
    throw new Error("evidence_store_unavailable");
  }
}
