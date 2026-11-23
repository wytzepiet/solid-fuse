import { highlight } from '@/lib/highlight';
import { agentSession, genCode, springCode, templateCode, type Pillar } from './content';

/** The piece of evidence next to a pillar. Each idea styles `.art` its own way. */
export async function PillarArt({ pillar }: { pillar: Pillar['key'] }) {
  if (pillar === 'agents') {
    return (
      <figure className="art art-term">
        <pre>
          {agentSession.map((line) => (
            <span key={line.cmd}>
              <i>$ </i>
              {line.cmd}
              {'\n'}
              {line.out && <em>{line.out + '\n'}</em>}
            </span>
          ))}
        </pre>
        <figcaption>
          A cloud agent running a phone app on Linux, with no screen.
        </figcaption>
      </figure>
    );
  }

  const [code, lang, caption] =
    pillar === 'ecosystems'
      ? [genCode, 'tsx', 'One export in Dart, one import in TypeScript.']
      : pillar === 'both'
        ? [springCode, 'tsx', 'A spring you read like any other signal.']
        : [templateCode, 'tsx', 'Sent once as a template. Only {total()} stays live in JS.'];

  return (
    <figure className="art art-code">
      <div dangerouslySetInnerHTML={{ __html: await highlight(code, lang) }} />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
