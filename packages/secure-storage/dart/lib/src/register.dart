import 'package:solid_fuse/solid_fuse.dart';
import 'controller.dart';

void register(FuseRuntime runtime) {
  runtime.registerController('secureStorage', FuseSecureStorage.new);
}
