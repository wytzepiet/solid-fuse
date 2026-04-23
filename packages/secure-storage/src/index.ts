import { createHandle, type Handle } from "solid-fuse";

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

export type SecureStorage = Handle<"secureStorage"> & {
  read: (key: string) => Promise<string | null>;
  write: (key: string, value: string) => Promise<void>;
  delete: (key: string) => Promise<void>;
  readAll: () => Promise<Record<string, string>>;
  deleteAll: () => Promise<void>;
  containsKey: (key: string) => Promise<boolean>;
  dispose: () => void;
};

export function createSecureStorage(
  options: SecureStorageOptions = {},
): SecureStorage {
  const { node, call, dispose } = createHandle("secureStorage", options);
  return {
    node,
    read: (key) => call("read", { key }),
    write: (key, value) => call("write", { key, value }),
    delete: (key) => call("delete", { key }),
    readAll: () => call("readAll"),
    deleteAll: () => call("deleteAll"),
    containsKey: (key) => call("containsKey", { key }),
    dispose,
  };
}

/**
 * Default process-lifetime instance using platform defaults.
 * Call [createSecureStorage] with explicit options if you need custom
 * iOS accessibility, an iOS group id, or non-default Android encryption.
 */
export const secureStorage: SecureStorage = createSecureStorage();
