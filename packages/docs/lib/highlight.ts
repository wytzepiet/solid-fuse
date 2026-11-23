import { createHighlighter } from 'shiki';
import { fuseTheme } from './code-theme';

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

/** Highlighted HTML for a snippet, in the site's code theme. */
export async function highlight(code: string, lang: string) {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      langs: ['tsx', 'dart', 'typescript', 'bash'],
      themes: [fuseTheme],
    });
  }
  const highlighter = await highlighterPromise;
  return highlighter.codeToHtml(code.trim(), { lang, theme: 'fuse' });
}
