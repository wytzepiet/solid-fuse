'use client';

import { useEffect, useState } from 'react';

/** The few lines an agent needs, with a button that copies them. */
export function CleanHandoff() {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  const text = `This app is built with solid-fuse. Its docs, as plain text: ${origin}/llms-full.txt

To check a change in the running app: start \`fuse dev --headless\` in the background, wait for "Ready for fuse drive", then use \`fuse drive\` (\`fuse drive help-ai\` lists the commands). Look at screenshots after changes.`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the text is on screen to select by hand.
    }
  };

  return (
    <figure className="cx-handoff">
      <figcaption>
        AGENTS.md
        <button type="button" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </figcaption>
      <pre>{text}</pre>
    </figure>
  );
}
