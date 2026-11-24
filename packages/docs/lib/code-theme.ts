import type { ThemeRegistrationRaw } from 'shiki';

/** The site's one code theme. Near-monochrome: white structure, grey syntax, orange for literal values. */
export const fuseTheme: ThemeRegistrationRaw = {
  name: 'fuse',
  type: 'dark',
  colors: { 'editor.background': '#131316', 'editor.foreground': '#c9c9cf' },
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

/** The home page's code theme on the light page: the same near-monochrome, darkened for white. */
export const fuseLightTheme: ThemeRegistrationRaw = {
  name: 'fuse-light',
  type: 'light',
  colors: { 'editor.background': '#faf9f6', 'editor.foreground': '#3c3c38' },
  settings: [
    { scope: ['comment'], settings: { foreground: '#8a8a82' } },
    {
      scope: ['keyword', 'storage.type', 'storage.modifier', 'constant.language'],
      settings: { foreground: '#6f6f6a' },
    },
    {
      scope: ['punctuation', 'meta.brace', 'punctuation.definition', 'punctuation.section', 'punctuation.separator', 'punctuation.terminator', 'punctuation.accessor', 'keyword.operator'],
      settings: { foreground: '#7d7d77' },
    },
    {
      scope: ['entity.name.tag', 'support.class', 'entity.name.type', 'entity.name.class', 'entity.name.function', 'support.function', 'meta.function-call'],
      settings: { foreground: '#000000' },
    },
    { scope: ['entity.other.attribute-name'], settings: { foreground: '#55554f' } },
    { scope: ['string', 'string.quoted', 'constant.numeric'], settings: { foreground: '#c2410c' } },
    { scope: ['string.template', 'meta.jsx.children'], settings: { foreground: '#3c3c38' } },
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
  colors: { 'editor.background': '#131316', 'editor.foreground': '#d0d0cb' },
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

/** The docs' code theme on the light page: the same roles, darkened to read on white. */
export const fuseDocsLightTheme: ThemeRegistrationRaw = {
  name: 'fuse-docs-light',
  type: 'light',
  colors: { 'editor.background': '#ffffff', 'editor.foreground': '#2b2b28' },
  settings: [
    { scope: ['comment'], settings: { foreground: '#8a8a82' } },
    {
      scope: ['keyword', 'storage.type', 'storage.modifier', 'constant.language', 'variable.language'],
      settings: { foreground: '#2f4fe0' },
    },
    {
      scope: ['punctuation', 'meta.brace', 'punctuation.definition', 'punctuation.section', 'punctuation.separator', 'punctuation.terminator', 'punctuation.accessor', 'keyword.operator'],
      settings: { foreground: '#7a7a72' },
    },
    {
      scope: ['entity.name.tag', 'support.class', 'entity.name.type', 'entity.name.class', 'entity.other.inherited-class'],
      settings: { foreground: '#8f5200' },
    },
    {
      scope: ['entity.name.function', 'support.function', 'meta.function-call'],
      settings: { foreground: '#000000' },
    },
    { scope: ['entity.other.attribute-name'], settings: { foreground: '#5c5c56' } },
    { scope: ['string', 'string.quoted', 'constant.numeric'], settings: { foreground: '#c2410c' } },
    { scope: ['string.template', 'meta.jsx.children'], settings: { foreground: '#2b2b28' } },
  ],
};
