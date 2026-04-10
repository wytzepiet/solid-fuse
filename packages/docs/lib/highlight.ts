import { createHighlighter } from 'shiki';
import type { ThemeRegistrationRaw } from 'shiki';

export const fuseTheme: ThemeRegistrationRaw = {
  name: 'fuse',
  type: 'dark',
  colors: {
    'editor.background': '#0a0a0c',
    'editor.foreground': '#b5b2ab',
  },
  settings: [
    {
      scope: ['keyword', 'storage.type', 'storage.modifier'],
      settings: { foreground: '#c9a0dc' },
    },
    {
      scope: ['entity.name.function', 'support.function', 'meta.function-call'],
      settings: { foreground: '#6fb8e0' },
    },
    {
      scope: ['string', 'string.quoted'],
      settings: { foreground: '#d4935a' },
    },
    {
      scope: ['entity.name.tag', 'support.class', 'entity.name.type', 'entity.name.class'],
      settings: { foreground: '#7ec699' },
    },
    {
      scope: ['entity.other.attribute-name'],
      settings: { foreground: '#d4a0d4' },
    },
    {
      scope: ['constant.numeric'],
      settings: { foreground: '#d4935a' },
    },
    {
      scope: ['variable', 'variable.other'],
      settings: { foreground: '#e8e6e0' },
    },
    {
      scope: ['comment'],
      settings: { foreground: '#3a3936', fontStyle: 'italic' },
    },
    {
      scope: ['punctuation', 'meta.brace', 'punctuation.dot', 'punctuation.terminator', 'punctuation.separator', 'punctuation.definition', 'punctuation.section', 'punctuation.accessor'],
      settings: { foreground: '#76746e' },
    },
    {
      scope: [
        'meta.object-literal.key',
        'support.type.property-name',
        'variable.parameter',
        'variable.other.readwrite',
        'variable.other.object',
        'variable.other.constant',
        'variable.language',
        'parameter.name',
        'variable.parameter.named',
      ],
      settings: { foreground: '#e8e6e0' },
    },
    {
      scope: ['string.template', 'meta.jsx.children'],
      settings: { foreground: '#e8e6e0' },
    },
    {
      scope: ['constant.language'],
      settings: { foreground: '#c9a0dc' },
    },
    {
      scope: ['entity.other.inherited-class'],
      settings: { foreground: '#7ec699' },
    },
  ],
};

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

export async function highlight(code: string, lang: string) {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      langs: ['tsx', 'dart', 'typescript', 'bash'],
      themes: [fuseTheme],
    });
  }
  const highlighter = await highlighterPromise;
  return highlighter.codeToHtml(code.trim(), {
    lang,
    theme: 'fuse',
  });
}
