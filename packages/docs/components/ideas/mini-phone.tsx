'use client';

import { useState } from 'react';

/** The counter from the first example, running. Tap it. */
export function MiniPhone() {
  const [count, setCount] = useState(0);
  return (
    <div className="dt-phone">
      <b key={count}>{count}</b>
      <button type="button" onClick={() => setCount(count + 1)}>
        Tap me
      </button>
    </div>
  );
}
