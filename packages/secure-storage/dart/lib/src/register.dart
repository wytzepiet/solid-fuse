import 'package:solid_fuse/solid_fuse.dart';
import 'handle.dart';

void register(FuseRuntime runtime) {
  runtime.registerHandle('secureStorage', FuseSecureStorage.new);
}
