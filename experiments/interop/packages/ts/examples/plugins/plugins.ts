// Canonical README snippets for five plugin packages, against the generated modules. No wrapper needed (class A).
import { SharedPreferences } from "~/modules/shared_preferences";
import { launchUrl } from "~/modules/url_launcher";
import { createImagePicker } from "~/modules/image_picker";
import { Geolocator } from "~/modules/geolocator";
import { createConnectivity } from "~/modules/connectivity_plus";
import { PackageInfo } from "~/modules/package_info_plus";
import { createLocalAuthentication } from "~/modules/local_auth";
import { Fluttertoast } from "~/modules/fluttertoast";

// shared_preferences: final prefs = await SharedPreferences.getInstance(); await prefs.setInt('counter', 10); prefs.getInt('counter')
export async function counter() {
  const prefs = await SharedPreferences.getInstance();
  await prefs.setInt("counter", 10);
  return (await prefs.getInt("counter")) ?? 0; // getInt is synchronous in Dart, a round trip here
}

// url_launcher: if (!await launchUrl(_url)) throw Exception('Could not launch $_url');
export async function open() {
  if (!(await launchUrl("https://flutter.dev", { mode: "externalApplication" }))) throw new Error("Could not launch");
}

// image_picker: final ImagePicker picker = ImagePicker(); final XFile? image = await picker.pickImage(source: ImageSource.gallery);
export async function pick() {
  const picker = createImagePicker();
  const image = await picker.pickImage({ source: "gallery" });
  return image?.path;
}

// geolocator: the README's _determinePosition()
export async function determinePosition() {
  if (!(await Geolocator.isLocationServiceEnabled())) throw new Error("Location services are disabled.");
  let permission = await Geolocator.checkPermission();
  if (permission === "denied") {
    permission = await Geolocator.requestPermission();
    if (permission === "denied") throw new Error("Location permissions are denied");
  }
  if (permission === "deniedForever") throw new Error("Location permissions are permanently denied");
  const p = await Geolocator.getCurrentPosition();
  return [p.latitude, p.longitude] as const;
}

// connectivity_plus: final List<ConnectivityResult> r = await Connectivity().checkConnectivity(); if (r.contains(ConnectivityResult.mobile)) ...
export async function online() {
  const r = await createConnectivity().checkConnectivity();
  return r.includes("mobile") || r.includes("wifi");
}

// package_info_plus: PackageInfo packageInfo = await PackageInfo.fromPlatform(); String version = packageInfo.version;
export const version = async () => (await PackageInfo.fromPlatform()).version;

// local_auth: final bool didAuthenticate = await auth.authenticate(localizedReason: 'Please authenticate to show account balance');
export const unlock = () => createLocalAuthentication().authenticate({ localizedReason: "Please authenticate to show account balance" });

// fluttertoast: Fluttertoast.showToast(msg: "This is Center Short Toast", toastLength: Toast.LENGTH_SHORT, gravity: ToastGravity.CENTER, ...)
export const toast = () => Fluttertoast.showToast({ msg: "This is Center Short Toast", toastLength: "LENGTH_SHORT", gravity: "CENTER", backgroundColor: "Colors.red", textColor: "Colors.white", fontSize: 16 });
