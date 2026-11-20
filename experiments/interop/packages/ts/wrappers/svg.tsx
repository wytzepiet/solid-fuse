// Thin TS wrapper over flutter_svg: one <Svg src> instead of SvgPictureAsset / SvgPictureNetwork / SvgPictureString,
// and `color` instead of a tagged ColorFilter. 1 native node (the constructor is picked per src kind).
// Per render: src classified (2 string tests), 1 prop remapped (color -> colorFilter object), rest forwarded.
import { omit } from "solid-js";
import { SvgPictureAsset, SvgPictureNetwork, SvgPictureString, type SvgPictureAssetProps, type Color } from "~/_generated/flutter_svg";

export interface SvgProps extends Omit<SvgPictureAssetProps, "assetName" | "children" | "colorFilter" | "bundle" | "package"> {
  /** An asset path, an http(s) URL, or inline `<svg ...>` markup. */
  src: string;
  /** Tint, like the old `color:` parameter (BlendMode.srcIn). */
  color?: Color;
}

export function Svg(props: SvgProps) {
  const rest = omit(props, "src", "color");
  const filter = () => (props.color === undefined ? undefined : ({ $: "mode", color: props.color, blendMode: "srcIn" } as const));
  if (props.src.startsWith("<")) return <SvgPictureString {...rest} string={props.src} colorFilter={filter()} />;
  if (/^https?:/.test(props.src)) return <SvgPictureNetwork {...rest} url={props.src} colorFilter={filter()} />;
  return <SvgPictureAsset {...rest} assetName={props.src} colorFilter={filter()} />;
}
