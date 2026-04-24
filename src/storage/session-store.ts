import { JsonFileStore } from "./json-file-store.js";
import type { SessionState, StoredJob } from "./types.js";

const emptyState: SessionState = {
  activeJob: null,
  lastCompletedJob: null
};

export class SessionStore {
  private readonly store: JsonFileStore<SessionState>;

  constructor(filePath: string) {
    this.store = new JsonFileStore(filePath, emptyState);
  }

  async getState(): Promise<SessionState> {
    return this.store.read();
  }

  async setActiveJob(job: StoredJob): Promise<void> {
    const state = await this.getState();
    await this.store.write({ ...state, activeJob: job });
  }

  async clearActiveJob(): Promise<void> {
    const state = await this.getState();
    await this.store.write({ ...state, activeJob: null });
  }

  async setLastCompletedJob(job: StoredJob): Promise<void> {
    await this.store.write({ activeJob: null, lastCompletedJob: job });
  }
}
