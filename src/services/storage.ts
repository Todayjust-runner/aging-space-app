type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const key = "aging-space-app:session:v1";
export function createSessionStorage(storage: StoragePort | undefined) {
  return {
    load(): unknown {
      try {
        return JSON.parse(storage?.getItem(key) ?? "null");
      } catch {
        return null;
      }
    },
    save(value: unknown): boolean {
      try {
        if (!storage) return false;
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    clear(): void {
      try {
        storage?.removeItem(key);
      } catch {
        /* Storage must not block restart. */
      }
    },
  };
}
export function browserSessionStorage() {
  try {
    return createSessionStorage(window.localStorage);
  } catch {
    return createSessionStorage(undefined);
  }
}
