// README: FaIcon(FontAwesomeIcons.gamepad)
import { FaIcon as RawFaIcon } from "~/_generated/font_awesome_flutter";
import { FaIcon } from "../../wrappers/fa-icon";

// BEFORE: unusable in practice, the icon constants are not generated.
export const Raw = () => <RawFaIcon icon={{ data: { codePoint: 0xf11b, fontFamily: "FontAwesomeSolid", fontPackage: "font_awesome_flutter" } }} />;
// AFTER
export const Nice = () => <FaIcon name="gamepad" size={24} color="#333333" />;
