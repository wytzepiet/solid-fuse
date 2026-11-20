// Thin TS wrapper over font_awesome_flutter.FaIcon. The generator does not surface `FontAwesomeIcons.*`
// (about 2,000 static consts on a holder class), so the raw API wants a code point and font names.
// The table below is DATA, not logic: an agent or a 20-line script can emit all of it from
// lib/font_awesome_flutter.dart. 1 native node. Per render: 1 table lookup, 1 prop remapped.
import { omit } from "solid-js";
import { FaIcon as RawFaIcon, type FaIconProps } from "~/_generated/font_awesome_flutter";

const solid = (codePoint: number) => ({ data: { codePoint, fontFamily: "FontAwesomeSolid", fontPackage: "font_awesome_flutter" } });
const brand = (codePoint: number) => ({ data: { codePoint, fontFamily: "FontAwesomeBrands", fontPackage: "font_awesome_flutter" } });
// 4 of ~2,000 entries, for the example.
export const FA = { gamepad: solid(0xf11b), house: solid(0xf015), heart: solid(0xf004), github: brand(0xf09b) } as const;

export function FaIcon(props: Omit<FaIconProps, "icon"> & { name: keyof typeof FA }) {
  const rest = omit(props, "name");
  return <RawFaIcon {...rest} icon={FA[props.name]} />;
}
