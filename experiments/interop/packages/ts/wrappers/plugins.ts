// Thin TS wrappers for two plugin modules. No native nodes beyond what the generated module creates.
import { createSignal } from "solid-js";
import { GoogleFonts } from "~/modules/google_fonts";
import { createAudioPlayer } from "~/modules/audioplayers";

/**
 * google_fonts: `Text('x', style: GoogleFonts.getFont('Lato'))`. The generated call is async and returns the whole
 * TextStyle as a record; all the built-in <Text> needs is the registered family name.
 * One bridge call per family (cached); the accessor is undefined until the font is registered.
 */
const families = new Map<string, Promise<string | undefined>>();
export function useGoogleFont(family: string): () => string | undefined {
  const [name, setName] = createSignal<string>();
  let p = families.get(family);
  if (!p) families.set(family, (p = GoogleFonts.getFont(family).then((s) => s.fontFamily ?? undefined)));
  void p.then((n) => setName(n));
  return name;
}

/**
 * audioplayers: `await player.play(UrlSource(url))`. The generator makes `Source` an object but `UrlSource` /
 * `AssetSource` records, so `play(source)` cannot be called with something JS can build. The same effect is
 * two generated calls. Per play(): 2 bridge calls instead of 1.
 */
export function createPlayer() {
  const player = createAudioPlayer();
  return {
    player,
    async play(src: string) {
      if (/^https?:/.test(src)) await player.setSourceUrl(src);
      else await player.setSourceAsset(src);
      await player.resume();
    },
    pause: () => player.pause(),
    stop: () => player.stop(),
  };
}
