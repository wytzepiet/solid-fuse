// Thin TS wrappers for three image/animation packages. Each renders exactly 1 native node.
import { omit } from "solid-js";
import { LottieBuilderAsset, LottieBuilderNetwork, type LottieBuilderAssetProps } from "~/_generated/lottie";
import { PhotoView, type PhotoViewProps } from "~/_generated/photo_view";

const isUrl = (s: string) => /^https?:/.test(s);

/** lottie: `Lottie.asset(name)` / `Lottie.network(url)` behind one `src`. Per render: 1 regexp test, 1 prop renamed. */
export function Lottie(props: Omit<LottieBuilderAssetProps, "name" | "children" | "bundle" | "package"> & { src: string }) {
  const rest = omit(props, "src");
  return isUrl(props.src) ? <LottieBuilderNetwork {...rest} src={props.src} /> : <LottieBuilderAsset {...rest} name={props.src} />;
}

/** photo_view: `imageProvider: AssetImage(x) | NetworkImage(x)` behind one `src`. Per render: 1 object built from src. */
export function Photo(props: Omit<PhotoViewProps, "imageProvider"> & { src: string }) {
  const rest = omit(props, "src");
  return (
    <PhotoView
      {...rest}
      imageProvider={isUrl(props.src) ? { $: "NetworkImage", url: props.src } : { $: "AssetImage", assetName: props.src }}
    />
  );
}
