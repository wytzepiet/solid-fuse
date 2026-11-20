// lottie README:     Lottie.asset('assets/LottieLogo1.json'), Lottie.network('https://.../Mobilo/A.json')
// photo_view README: PhotoView(imageProvider: AssetImage("assets/large-image.jpg"))
import { LottieBuilderAsset, LottieBuilderNetwork } from "~/_generated/lottie";
import { PhotoView } from "~/_generated/photo_view";
import { Lottie, Photo } from "../../wrappers/media";

export const Raw = () => (
  <>
    <LottieBuilderAsset name="assets/LottieLogo1.json" />
    <LottieBuilderNetwork src="https://raw.githubusercontent.com/xvrh/lottie-flutter/master/example/assets/Mobilo/A.json" />
    <PhotoView imageProvider={{ $: "AssetImage", assetName: "assets/large-image.jpg" }} />
  </>
);
export const Nice = () => (
  <>
    <Lottie src="assets/LottieLogo1.json" />
    <Lottie src="https://raw.githubusercontent.com/xvrh/lottie-flutter/master/example/assets/Mobilo/A.json" repeat={false} />
    <Photo src="assets/large-image.jpg" enableRotation />
  </>
);
