// google_fonts README: Text('This is Google Fonts', style: GoogleFonts.getFont('Lato'))
// audioplayers README: final player = AudioPlayer(); await player.play(UrlSource('https://example.com/my-audio.wav'));
import { Text } from "solid-fuse";
import { GoogleFonts } from "~/modules/google_fonts";
import { createSignal } from "solid-js";
import { createPlayer, useGoogleFont } from "../../wrappers/plugins";

// BEFORE
export function RawFont() {
  const [family, setFamily] = createSignal<string>();
  void GoogleFonts.getFont("Lato").then((style) => setFamily(style.fontFamily ?? undefined));
  return <Text fontFamily={family()}>This is Google Fonts</Text>;
}
// AFTER
export function NiceFont() {
  const lato = useGoogleFont("Lato");
  return <Text fontFamily={lato()}>This is Google Fonts</Text>;
}
export const beep = () => createPlayer().play("https://example.com/my-audio.wav");
