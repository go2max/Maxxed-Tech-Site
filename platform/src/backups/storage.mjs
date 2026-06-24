export class MemoryBackupStore {
  constructor() {
    this.objects = new Map();
  }

  async put(key, bytes) {
    const body = new Uint8Array(bytes);
    this.objects.set(key, new Uint8Array(body));
    return { key, size: body.byteLength };
  }

  async get(key) {
    const body = this.objects.get(key);
    return body ? new Uint8Array(body) : null;
  }

  async delete(key) {
    this.objects.delete(key);
  }
}

export class R2BackupStore {
  constructor(binding) {
    if (!binding?.put || !binding?.get || !binding?.delete) {
      throw new Error("invalid_backup_bucket_binding");
    }
    this.binding = binding;
  }

  async put(key, bytes) {
    await this.binding.put(key, bytes, {
      httpMetadata: { contentType: "application/octet-stream" },
    });
    return { key, size: bytes.byteLength };
  }

  async get(key) {
    const object = await this.binding.get(key);
    return object ? new Uint8Array(await object.arrayBuffer()) : null;
  }

  async delete(key) {
    await this.binding.delete(key);
  }
}

export class UnavailableBackupStore {
  async put() {
    throw new Error("backup_store_unavailable");
  }

  async get() {
    throw new Error("backup_store_unavailable");
  }

  async delete() {
    throw new Error("backup_store_unavailable");
  }
}
