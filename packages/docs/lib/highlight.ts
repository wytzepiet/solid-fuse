import { createHighlighter } from 'shiki';
import { fuseLightTheme, fuseTheme } from './code-theme';

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

/** Highlighted HTML for a snippet, in the site's code theme, light and dark. */
export async function highlight(code: string, lang: string) {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      langs: ['tsx', 'dart', 'typescript', 'bash'],
      themes: [fuseLightTheme, fuseTheme],
    });
  }
  const highlighter = await highlighterPromise;
  // Colours as --shiki-light / --shiki-dark only; Fumadocs' CSS picks one by theme.
  return highlighter.codeToHtml(code.trim(), {
    lang,
    themes: { light: 'fuse-light', dark: 'fuse' },
    defaultColor: false,
  });
}
