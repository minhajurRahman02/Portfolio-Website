import { Link } from 'react-router-dom';
import { routes } from '../data/site.js';

/* The fourth 3D-type placement: the 404 number is extruded with the same
   .n-ext treatment as the hero name. */
export default function NotFound() {
  return (
    <section className="page page-404" data-page="404">
      <div className="nf">
        <h1 className="name3d nf-num" aria-label="404">
          <span className="n-line"><span className="n-ext" data-t="404">404</span></span>
        </h1>
        <p className="lede">
          Nothing at this address. The sky is still here, which is something.
        </p>
        <div className="nf-links">
          {routes.map((r) => (
            <Link className="btn btn-ghost" to={r.path} key={r.key} data-magnetic>
              {r.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
