import { CleanHandoff } from './clean-handoff';
import { DitherCanvas, type DitherScene } from './dither-canvas';
import { MiniPhone } from './mini-phone';
import { agentSession, dartCode } from './content';
import { agent, basics, names, ready, tour, why } from './tour';
import { highlight } from '@/lib/highlight';

const pictures: DitherScene[] = ['spring', 'async', 'chart', 'platforms'];
const quiet = (code: string, lang: string) => highlight(code, lang);

/**
 * Questions two to seven of the pitch, as plain sections (styled by
 * dither.css). `basics` is left out where the hero already shows a first
 * example.
 */
export async function PitchSections({ showBasics = true }: { showBasics?: boolean }) {
  const [chapters, basicsHtml, dartHtml] = await Promise.all([
    Promise.all(
      tour.map(async (c) => ({
        ...c,
        html: await Promise.all(c.code.map(([code, lang]) => quiet(code, lang))),
      })),
    ),
    quiet(basics.code[0][0], 'tsx'),
    quiet(dartCode, 'dart'),
  ]);

  return (
    <>
      {/* 2. What are these two names */}
      <section className="dt-names">
        <article>
          <h2>{names[0].title}</h2>
          <p>{names[0].body}</p>
          <pre className="dt-fig dt-fig-code" aria-hidden>
            {'<View>\n  <Text>Total</Text>\n  <Text>'}
            <mark>{'{count()}'}</mark>
            {'</Text>'}
            <i>only this runs again</i>
            {'\n</View>'}
          </pre>
        </article>
        <article>
          <h2>{names[1].title}</h2>
          <p>{names[1].body}</p>
          <div className="dt-fig dt-fig-devices" aria-hidden>
            {['iPhone', 'Android', 'Desktop'].map((device) => (
              <figure key={device} className={`dt-dev dt-dev-${device.toLowerCase()}`}>
                <div>
                  <b>3</b>
                  <i />
                </div>
                <figcaption>{device}</figcaption>
              </figure>
            ))}
          </div>
        </article>
      </section>

      {/* 3. Will I recognise it */}
      {showBasics && (
      <section className="dt-basics">
        <div className="dt-basics-text">
          <h2>{basics.title}</h2>
          <p>{basics.note}</p>
        </div>
        <div className="dt-code" dangerouslySetInnerHTML={{ __html: basicsHtml }} />
        <MiniPhone />
      </section>
      )}

      {/* 4. Why this and not React Native */}
      <section className="dt-why">
        <div className="dt-card">
        <h2>{why.title}</h2>
        <div className="dt-compare" role="table">
          <div role="row" className="dt-compare-head">
            <span role="columnheader" />
            <span role="columnheader">React Native</span>
            <span role="columnheader">solid-fuse</span>
          </div>
          {why.rows.map(([what, theirs, ours]) => (
            <div role="row" key={what}>
              <span role="rowheader">{what}</span>
              <span role="cell">{theirs}</span>
              <span role="cell">{ours}</span>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* 5. What can I do with it */}
      <section className="dt-tour">
        {chapters.map((chapter, i) => (
          <article key={chapter.name} className="dt-chapter">
            <div className="dt-chapter-text">
              <span className="dt-name">{chapter.name}</span>
              <h2>{chapter.title}</h2>
              <p>{chapter.note}</p>
            </div>
            <div className="dt-code">
              {chapter.html.map((html, j) => (
                <div key={j} dangerouslySetInnerHTML={{ __html: html }} />
              ))}
            </div>
            <div className="dt-picture">
              <DitherCanvas scene={pictures[i]} cell={6} />
            </div>
          </article>
        ))}
      </section>

      {/* 6. Can my agent work with it */}
      <section className="dt-agent">
        <div className="dt-card">
        <div className="dt-agent-head">
          <h2>{agent.title}</h2>
          <p>{agent.body}</p>
        </div>
        <pre className="dt-term">
          {agentSession.map((line) => (
            <span key={line.cmd}>
              <i>$ </i>
              {line.cmd}
              {'\n'}
              {line.out && <em>{line.out + '\n'}</em>}
            </span>
          ))}
        </pre>
        <div className="dt-handoff">
          <CleanHandoff />
          <p>
            Paste this into your agent’s instructions. The docs are also
            served as plain text: <a href="/llms.txt">llms.txt</a>,{' '}
            <a href="/llms-full.txt">llms-full.txt</a>.
          </p>
        </div>
        </div>
      </section>

      {/* 7. Is it ready, and how do I start */}
      <section className="dt-ready">
        <div className="dt-card">
        <div>
          <h2>{ready.title}</h2>
          <p>{ready.body}</p>
        </div>
        <figure>
          <figcaption>dart/lib/main.dart, written once</figcaption>
          <div className="dt-code" dangerouslySetInnerHTML={{ __html: dartHtml }} />
        </figure>
        </div>
      </section>
    </>
  );
}
