// README: SvgPicture.asset('assets/logo.svg', semanticsLabel: 'Dart Logo')
//         SvgPicture.asset(assetName, colorFilter: const ColorFilter.mode(Colors.red, BlendMode.srcIn), semanticsLabel: 'Red dash paths')
//         SvgPicture.network('https://site.com/x.svg', placeholderBuilder: (context) => CircularProgressIndicator())  <- placeholderBuilder NOT bridged
import { SvgPictureAsset, SvgPictureNetwork } from "~/_generated/flutter_svg";
import { Svg } from "../../wrappers/svg";

// BEFORE
export const Raw = () => (
  <>
    <SvgPictureAsset assetName="assets/logo.svg" semanticsLabel="Dart Logo" />
    <SvgPictureAsset assetName="assets/dash.svg" colorFilter={{ $: "mode", color: "Colors.red", blendMode: "srcIn" }} semanticsLabel="Red dash paths" />
    <SvgPictureNetwork url="https://site.com/x.svg" width={48} />
  </>
);
// AFTER
export const Nice = () => (
  <>
    <Svg src="assets/logo.svg" semanticsLabel="Dart Logo" />
    <Svg src="assets/dash.svg" color="Colors.red" semanticsLabel="Red dash paths" />
    <Svg src="https://site.com/x.svg" width={48} />
  </>
);
