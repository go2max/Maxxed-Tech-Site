import { mkdir, open, readFile, rename, writeFile, copyFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";

function emptyState() {
  return { activeJob: null, deviceLease: null, runnerLease: null, jobs: [] };
}

async function safeParse(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

export class RunnerStateStore {
  constructor(rootDir, stateFileName = "runner-state.json") {
    this.path = resolve(rootDir, stateFileName);
    this.backupPath = `${this.path}.bak`;
    this.lockPath = `${this.path}.lock`;
  }

  async #withLock(work) {
    await mkdir(dirname(this.path), { recursive: true });
    let handle;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        handle = await open(this.lockPath, "wx");
        break;
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 20));
      }
    }
    if (!handle) throw new Error("state_lock_timeout");
    try {
      return await work();
    } finally {
      await handle.close();
      await rm(this.lockPath, { force: true });
    }
  }

  async read() {
    const primary = await safeParse(this.path);
    if (primary) return primary;
    const backup = await safeParse(this.backupPath);
    if (backup) {
      await writeFile(this.path, JSON.stringify(backup, null, 2));
      return backup;
    }
    return emptyState();
  }

  async write(nextState) {
    const tempPath = `${this.path}.${crypto.randomUUID()}.tmp`;
    await mkdir(dirname(this.path), { recursive: true });
    try {
      await copyFile(this.path, this.backupPath);
    } catch {
      // ignore first-write backup failures
    }
    await writeFile(tempPath, JSON.stringify(nextState, null, 2));
    await rename(tempPath, this.path);
    await copyFile(this.path, this.backupPath);
  }

  async transact(updater) {
    return this.#withLock(async () => {
      const current = await this.read();
      const nextState = await updater(structuredClone(current));
      await this.write(nextState);
      return nextState;
    });
  }
}
