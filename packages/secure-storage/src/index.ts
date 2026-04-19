import { createController } from "solid-fuse";

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

export type SecureStorage = {
  read: (key: string) => Promise<string | null>;
  write: (key: string, value: string) => Promise<void>;
  delete: (key: string) => Promise<void>;
  readAll: () => Promise<Record<string, string>>;
  deleteAll: () => Promise<void>;
  containsKey: (key: string) => Promise<boolean>;
};

export function createSecureStorage(
  options: SecureStorageOptions = {},
): SecureStorage {
  const { call } = createController("secureStorage", options);
  return {
    read: (key) => call("read", { key }),
    write: (key, value) => call("write", { key, value }),
    delete: (key) => call("delete", { key }),
    readAll: () => call("readAll"),
    deleteAll: () => call("deleteAll"),
    containsKey: (key) => call("containsKey", { key }),
  };
}

export const secureStorage: SecureStorage = createSecureStorage();
