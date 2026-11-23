// Every docs page's frontmatter must be valid YAML. fumadocs-mdx parses it
// with `yaml` during `next build`, and one bad page fails the whole deploy.
// Common trap: an unquoted value containing ": " (quote the value).
import { expect, test } from 'bun:test';
import { Glob } from 'bun';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const pages = [...new Glob('content/**/*.mdx').scanSync(import.meta.dir)];

test('found docs pages', () => expect(pages.length).toBeGreaterThan(0));

for (const page of pages) {
  test(page, () => {
    const src = readFileSync(`${import.meta.dir}/${page}`, 'utf8');
    const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return;
    const data = parse(match[1]);
    expect(typeof data?.title).toBe('string');
  });
}
