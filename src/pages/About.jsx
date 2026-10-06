import { useNavigate } from 'react-router-dom';
import { Cube, Reveal, SplitHeading } from '../components/primitives.jsx';
import PhotoStack from '../components/PhotoStack.jsx';
import Carousel from '../components/Carousel.jsx';
import { StudyBot } from '../components/Robot.jsx';
import { about, education } from '../data/site.js';

export default function About() {
  const navigate = useNavigate();

  return (
    <section className="page" data-page="about">
      <div className="page-head">
        <p className="eyebrow mono">03 — About</p>
        <SplitHeading text="Who is behind this" as="h1" big />
      </div>

      <div className="about-top">
        <PhotoStack />
        <div className="about-copy">
          <Reveal as="p" className="lede">{about.lede}</Reveal>
          {about.body.map((p) => (
            <Reveal as="p" key={p.slice(0, 24)}>{p}</Reveal>
          ))}
          <p className="placeholder-note mono xs">
            Placeholder prose — send me this in your own words and I will drop it in.
          </p>
        </div>
      </div>

      {/* Education and the contact controls are the two neumorphic zones;
          everything else on the site is glass. */}
      <section className="sect slab" data-zone="panel">
        <StudyBot />
        <div className="sect-head">
          <Cube face="04" />
          <SplitHeading text="Education" />
        </div>
        <div className="timeline">
          <span className="tl-line" aria-hidden="true" />
          {education.map((e) => (
            <Reveal className="edu neu" key={e.degree}>
              <div className="edu-l">
                <h3>{e.degree}</h3>
                <p>{e.school}</p>
                {e.note && <p className="mono xs dim">{e.note}</p>}
                {e.result && <strong>{e.result}</strong>}
              </div>
              <div className="edu-r">
                <span>{e.years}</span>
                {e.flag && <em className="mono xs">{e.flag}</em>}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="sect" data-zone="glass">
        <div className="sect-head">
          <Cube face="05" />
          <SplitHeading text="Outside the lab" />
          <p className="sect-note">Drag to spin · click a panel to open it.</p>
        </div>
        <Carousel onPick={(id) => navigate(`/interests#int-${id}`)} />
      </section>
    </section>
  );
}
