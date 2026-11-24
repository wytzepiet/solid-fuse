import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// Where the pages of the old sidebar (Building / Extending) went.
const moved = {
  'getting-started': 'start/quick-start',
  architecture: 'internals/architecture',
  'building/ui-and-layout': 'build/layout',
  'building/core-widgets': 'reference/components',
  'building/design-packages': 'build/design-packages',
  'building/icons': 'build/images-icons-fonts',
  'building/host': 'build/device',
  'building/animation': 'build/animation',
  'building/navigation': 'navigate/pages',
  'building/handles': 'flutter/controllers',
  'building/channels': 'flutter/channels',
  'building/agents': 'agents',
  'extending/generating': 'flutter/widgets',
  'extending/using-packages': 'flutter/pub-packages',
  'extending/creating-widgets': 'flutter/by-hand/widgets',
  'extending/creating-handles': 'flutter/by-hand/handles',
  'extending/creating-pages': 'flutter/by-hand/pages',
  'extending/packaging': 'ship/packages',
};

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  redirects: async () =>
    Object.entries(moved).map(([from, to]) => ({
      source: `/docs/${from}`,
      destination: `/docs/${to}`,
      permanent: true,
    })),
};

export default withMDX(config);
