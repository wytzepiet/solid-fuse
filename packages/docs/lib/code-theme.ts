import type { ThemeRegistrationRaw } from 'shiki';

/** The site's one code theme. Near-monochrome: white structure, grey syntax, orange for literal values. */
export const fuseTheme: ThemeRegistrationRaw = {
  name: 'fuse',
  type: 'dark',
  colors: { 'editor.background': '#000000', 'editor.foreground': '#c9c9cf' },
  settings: [
    { scope: ['comment'], settings: { foreground: '#55555a' } },
    {
      scope: ['keyword', 'storage.type', 'storage.modifier', 'constant.language'],
      settings: { foreground: '#86868b' },
    },
    {
      scope: ['punctuation', 'meta.brace', 'punctuation.definition', 'punctuation.section', 'punctuation.separator', 'punctuation.terminator', 'punctuation.accessor', 'keyword.operator'],
      settings: { foreground: '#6e6e73' },
    },
    {
      scope: ['entity.name.tag', 'support.class', 'entity.name.type', 'entity.name.class', 'entity.name.function', 'support.function', 'meta.function-call'],
      settings: { foreground: '#ffffff' },
    },
    { scope: ['entity.other.attribute-name'], settings: { foreground: '#a1a1a6' } },
    { scope: ['string', 'string.quoted', 'constant.numeric'], settings: { foreground: '#ffa45c' } },
    { scope: ['string.template', 'meta.jsx.children'], settings: { foreground: '#c9c9cf' } },
  ],
};

/**
 * The docs' code theme: the same family, with enough colour to scan long
 * code by. It uses the three colours of the dither marks: blue for the
 * language's own words, orange for literal values, cream for the names of
 * components and types.
 */
export const fuseDocsTheme: ThemeRegistrationRaw = {
  name: 'fuse-docs',
  type: 'dark',
  colors: { 'editor.background': '#000000', 'editor.foreground': '#d0d0cb' },
  settings: [
    { scope: ['comment'], settings: { foreground: '#62625c' } },
    {
      scope: ['keyword', 'storage.type', 'storage.modifier', 'constant.language', 'variable.language'],
      settings: { foreground: '#7f9bff' },
    },
    {
      scope: ['punctuation', 'meta.brace', 'punctuation.definition', 'punctuation.section', 'punctuation.separator', 'punctuation.terminator', 'punctuation.accessor', 'keyword.operator'],
      settings: { foreground: '#77776f' },
    },
    {
      scope: ['entity.name.tag', 'support.class', 'entity.name.type', 'entity.name.class', 'entity.other.inherited-class'],
      settings: { foreground: '#ffe6bd' },
    },
    {
      scope: ['entity.name.function', 'support.function', 'meta.function-call'],
      settings: { foreground: '#ffffff' },
    },
    { scope: ['entity.other.attribute-name'], settings: { foreground: '#a9a9a3' } },
    { scope: ['string', 'string.quoted', 'constant.numeric'], settings: { foreground: '#ff9a52' } },
    { scope: ['string.template', 'meta.jsx.children'], settings: { foreground: '#d0d0cb' } },
  ],
};
