import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:solid_fuse/solid_fuse.dart';

class FuseSecureStorage extends FuseController<FlutterSecureStorage> {
  FuseSecureStorage(super.node);

  @override
  FlutterSecureStorage create() {
    return FlutterSecureStorage(
      iOptions: IOSOptions(
        accessibility: _parseAccessibility(node.string('iosAccessibility')) ??
            KeychainAccessibility.unlocked,
        groupId: node.string('groupId'),
      ),
      aOptions: AndroidOptions(
        encryptedSharedPreferences:
            node.bool('androidEncryptedSharedPreferences') ?? true,
        resetOnError: node.bool('androidResetOnError') ?? false,
      ),
    );
  }

  @override
  Future<dynamic> call(
    FlutterSecureStorage object,
    String method,
    dynamic value,
  ) async {
    final data = FuseMap.from(value);
    switch (method) {
      case 'read':
        return object.read(key: data!.string('key')!);
      case 'write':
        return object.write(
          key: data!.string('key')!,
          value: data.string('value')!,
        );
      case 'delete':
        return object.delete(key: data!.string('key')!);
      case 'readAll':
        return object.readAll();
      case 'deleteAll':
        return object.deleteAll();
      case 'containsKey':
        return object.containsKey(key: data!.string('key')!);
    }
    throw StateError('Unknown secureStorage method: $method');
  }

  static KeychainAccessibility? _parseAccessibility(String? value) {
    switch (value) {
      case 'passcode':
        return KeychainAccessibility.passcode;
      case 'unlocked':
        return KeychainAccessibility.unlocked;
      case 'unlocked_this_device':
        return KeychainAccessibility.unlocked_this_device;
      case 'first_unlock':
        return KeychainAccessibility.first_unlock;
      case 'first_unlock_this_device':
        return KeychainAccessibility.first_unlock_this_device;
    }
    return null;
  }
}
