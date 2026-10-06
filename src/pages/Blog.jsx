import { Reveal, SplitHeading } from '../components/primitives.jsx';
import { posts } from '../data/site.js';

/* Built, but stubbed on purpose: the structure is here so a real post only
   needs an entry in src/data/site.js. */
export default function Blog() {
  return (
    <section className="page" data-page="blog">
      <div className="page-head">
        <p className="eyebrow mono">04 — Blog</p>
        <SplitHeading text="Notes in progress" as="h1" big />
        <p className="lede">
          Working notes from the research, written as I go. The drafts below are placeholders for
          the real thing.
        </p>
      </div>
      <div className="posts">
        {posts.map((p) => (
          <Reveal as="article" className="post glass-card" key={p.slug} tabIndex={0}>
            <div className="post-meta mono xs">
              <span className="chip">{p.status}</span>
              <span className="dim">{p.minutes} min</span>
              <span className="dim">{p.topic}</span>
            </div>
            <h2>{p.title}</h2>
            <p>{p.excerpt}</p>
            <span className="arrow">→</span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
