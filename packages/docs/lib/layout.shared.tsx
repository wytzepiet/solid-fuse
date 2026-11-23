import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { gitConfig } from './shared';

/** The mark: the site's dither steps, from a dot up to a full block. Same drawing as app/icon.svg. */
export function FuseMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" aria-hidden>
      <rect width="512" height="512" rx="112" fill="#000" />
      <rect x="4" y="4" width="504" height="504" rx="108" stroke="#2b2b29" strokeWidth="8" />
      <rect x="103" y="103" width="66" height="66" fill="none" stroke="#ff7a1f" strokeWidth="16"/>
  <rect x="216" y="96" width="80" height="80" fill="#ff7a1f"/>
  <rect x="322" y="82" width="108" height="108" fill="#ffe6bd"/>
  <path d="M100 256h72M136 220v72" stroke="#3d5cff" strokeWidth="18"/>
  <rect x="223" y="223" width="66" height="66" fill="none" stroke="#ff7a1f" strokeWidth="16"/>
  <rect x="336" y="216" width="80" height="80" fill="#ff7a1f"/>
  <circle cx="136" cy="376" r="17" fill="#3d5cff"/>
  <path d="M220 376h72M256 340v72" stroke="#3d5cff" strokeWidth="18"/>
  <rect x="343" y="343" width="66" height="66" fill="none" stroke="#ff7a1f" strokeWidth="16"/>
    </svg>
  );
}

export function FuseLogo() {
  return (
    <span className="fuse-logo">
      <FuseMark />
      solid-fuse
    </span>
  );
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <FuseLogo />,
    },
    themeSwitch: { enabled: false },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
