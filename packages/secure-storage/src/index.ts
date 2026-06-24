import { getOwner, onCleanup } from "solid-js";
import { FuseHandle } from "solid-fuse";

export type IOSAccessibility =
  | "passcode"
  | "unlocked"
  | "unlocked_this_device"
  | "first_unlock"
  | "first_unlock_this_device";

export type SecureStorageOptions = {
  iosAccessibility?: IOSAccessibility;
  groupId?: string;
  androidEncryptedSharedPreferences?: boolean;
  androidResetOnError?: boolean;
};

export class SecureStorage extends FuseHandle<"secureStorage"> {
  constructor(options: SecureStorageOptions = {}) {
    super("secureStorage", options);
  }

  read(key: string): Promise<string | null> {
    return this.call("read", { key });
  }

  write(key: string, value: string): Promise<void> {
    return this.call("write", { key, value });
  }

  delete(key: string): Promise<void> {
    return this.call("delete", { key });
  }

  readAll(): Promise<Record<string, string>> {
    return this.call("readAll");
  }

  deleteAll(): Promise<void> {
    return this.call("deleteAll");
  }

  containsKey(key: string): Promise<boolean> {
    return this.call("containsKey", { key });
  }
}

export function createSecureStorage(
  options: SecureStorageOptions = {},
): SecureStorage {
  const storage = new SecureStorage(options);
  if (getOwner()) onCleanup(() => storage.dispose());
  return storage;
}

/**
 * Default process-lifetime instance using platform defaults.
 * Call [createSecureStorage] with explicit options if you need custom
 * iOS accessibility, an iOS group id, or non-default Android encryption.
 */
export const secureStorage: SecureStorage = createSecureStorage();
