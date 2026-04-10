import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { gitConfig } from './shared';

function FuseLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex items-center justify-center rounded-md"
        style={{
          width: 26,
          height: 26,
          background: 'var(--fuse-accent)'
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 512 512"
          fill="none"
          style={{
            fillRule: 'evenodd',
            clipRule: 'evenodd',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }}
        >
          <g transform="matrix(1.625064,0,0,1.74791,-219.191526,-285.107611)">
            <path
              d="M349.885,261.354L284.815,405.08C323.786,319 371.177,319 430,319C371.177,319 328.929,319 349.885,261.354Z"
              style={{ fill: '#081a18', stroke: '#081a18', strokeWidth: 24 }}
            />
          </g>
          <g transform="matrix(-1.625064,0,0,-1.74791,731.191526,830.52729)">
            <path
              d="M349.885,261.354L270.714,435.643C323.699,319 371.177,319 430,319C371.177,319 328.929,319 349.885,261.354Z"
              style={{ fill: '#081a18', stroke: '#081a18', strokeWidth: 24 }}
            />
          </g>
        </svg>
      </div>
      <span
        className="text-sm font-bold"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        solid-fuse
      </span>
    </div>
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
