import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";

async function ensureFile(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}

export class RunnerStateStore {
  constructor(rootDir, stateFileName = "runner-state.json") {
    this.path = resolve(rootDir, stateFileName);
    this.queue = Promise.resolve();
  }

  async read() {
    return ensureFile(this.path, { activeJob: null, deviceLease: null, runnerLease: null, jobs: [] });
  }

  async write(nextState) {
    const tempPath = `${this.path}.${crypto.randomUUID()}.tmp`;
    await writeFile(tempPath, JSON.stringify(nextState, null, 2));
    await rename(tempPath, this.path);
  }

  async transact(updater) {
    const operation = this.queue.then(async () => {
      const current = await this.read();
      const nextState = await updater(structuredClone(current));
      await this.write(nextState);
      return nextState;
    });
    this.queue = operation.catch(() => {});
    return operation;
  }

  async clear() {
    await rm(this.path, { force: true });
  }
}
