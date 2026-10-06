import { SplitHeading } from '../components/primitives.jsx';
import WorkZone, { NeuralCanvas } from '../components/WorkZone.jsx';
import { BuildBot } from '../components/Robot.jsx';

/* Two zones, kept visually distinct because the work is judged differently:
   research by what it proves, engineering by whether it runs. */
export default function Work({ onCase }) {
  return (
    <section className="page" data-page="work">
      <div className="page-head">
        <p className="eyebrow mono">02 — Work</p>
        <SplitHeading text="Research & engineering" as="h1" big />
        <p className="lede">
          Two kinds of work, kept separate because they are judged differently. Research is
          measured by what it proves; engineering by whether it runs.
        </p>
      </div>

      <WorkZone
        zone="research"
        letter="R"
        label="Research"
        note="Scroll to travel sideways."
        onOpen={onCase}
      >
        <NeuralCanvas />
      </WorkZone>

      <WorkZone
        zone="engineering"
        letter="E"
        label="Engineering"
        note="Shipped, or close to it."
        onOpen={onCase}
      >
        <BuildBot />
      </WorkZone>
    </section>
  );
}
