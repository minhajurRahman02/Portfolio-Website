import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Term } from '../lib/terminal.js';
import { onFrame } from '../lib/loop.js';
import { useApp } from '../context/AppState.jsx';
import { routes } from '../data/site.js';
import { work } from '../data/work.js';

/* The hidden terminal: `~` anywhere, or Features → Terminal. Term itself owns
   the canvases (radar, alien scan) and the command loop; this component owns
   the markup and wires the commands that need app state. */
export default function TerminalPane() {
  const navigate = useNavigate();
  const { toggleTheme, setClear, toggleFeature, setTermOpen } = useApp();

  const nav = useRef(navigate);
  nav.current = navigate;
  const api = useRef({ toggleTheme, setClear, toggleFeature, setTermOpen });
  api.current = { toggleTheme, setClear, toggleFeature, setTermOpen };

  useEffect(() => {
    Term.init();

    const pages = routes.map((r) => r.key);
    const pathOf = (k) => routes.find((r) => r.key === k)?.path || '/';

    Term.register('help', () => {
      Term.echo('<span class="ac">available commands</span>');
      Term.echo(
        '  <span class="cm">whoami</span>      who is this\n' +
          '  <span class="cm">ls</span>          list sections\n' +
          '  <span class="cm">projects</span>    list projects\n' +
          '  <span class="cm">cat</span> &lt;file&gt;   read a file\n' +
          '  <span class="cm">open</span> &lt;page&gt;  navigate\n' +
          '  <span class="cm">theme</span>       toggle light/dark\n' +
          '  <span class="cm">sky</span>         clear the sky\n' +
          '  <span class="cm">flashlight</span>  dark-room mode\n' +
          '  <span class="cm">kill</span>        drop whatever is on the channel\n' +
          '  <span class="cm">neofetch</span> · <span class="cm">sudo hire-me</span> · <span class="cm">clear</span> · <span class="cm">exit</span>'
      );
    });

    Term.register('whoami', () =>
      Term.echo(
        'md minhajur rahman — CSE, United International University.\nVision-language model efficiency · optimisation systems · HCI.',
        'ok'
      )
    );

    Term.register('ls', () => Term.echo(pages.map((p) => `${p}/`).join('  '), 'ac'));

    Term.register('projects', () => {
      work.forEach((w) => {
        Term.echo(`${w.id}/`.padEnd(15, ' ').replace(/ /g, '&nbsp;') +
          `<span class="dimline">${w.sub} — ${w.chip}</span>`);
      });
    });

    Term.register('cat', (a) => {
      const f = (a || '').replace(/^\.\//, '');
      if (f === 'about.txt')
        return Term.echo(
          'Final-year CSE student. Spends most of its time asking how much\nenergy a vision-language model wastes, how a country should move\nblood between hospitals, and what happens to people exposed to\nAI that flatters them.',
          'ok'
        );
      if (f === 'skills.txt')
        return Term.echo(
          'python c cpp java javascript sql\npytorch transformers sklearn pandas numpy\nreact node express tailwind postgres supabase\npulp cbc milp docker git linux',
          'ok'
        );
      return Term.echo(
        `cat: ${f || '(no file)'}: No such file. Try about.txt or skills.txt`,
        'er'
      );
    });

    Term.register('open', (a) => {
      if (!pages.includes(a))
        return Term.echo(`open: unknown page "${a || ''}". Try: ${pages.join(', ')}`, 'er');
      Term.echo(`opening /${a} ...`, 'ok');
      Term.hide();
      api.current.setTermOpen(false);
      nav.current(pathOf(a));
    });

    Term.register('theme', () => { api.current.toggleTheme(); Term.echo('theme switched', 'ok'); });

    Term.register('sky', () => {
      const on = !document.body.classList.contains('skyclear');
      api.current.setClear(on, true);
      Term.echo(`sky: ${on ? 'cleared' : 'restored'}`, 'ok');
    });

    Term.register('flashlight', () => {
      api.current.toggleFeature('flash');
      Term.echo(`flashlight ${document.body.classList.contains('flash') ? 'off' : 'on'}`, 'ok');
    });

    Term.register('neofetch', () => {
      Term.echo('<span class="ac">      ◎      </span>  visitor@minhajur.dev');
      Term.echo('<span class="ac">    ⟋   ⟍    </span>  ─────────────────────');
      Term.echo('<span class="ac">   ◦  ●  ◦   </span>  Role: ML researcher / engineer');
      Term.echo('<span class="ac">    ⟍   ⟋    </span>  Location: Dhaka, Bangladesh');
      Term.echo('<span class="ac">      ◎      </span>  Stack: React · PyTorch · Flask');
      Term.echo('                 Shell: portfolio.sh');
    });

    Term.register('clear', () => { if (Term.out) Term.out.innerHTML = ''; });

    Term.register('exit', () => { Term.hide(); api.current.setTermOpen(false); });

    Term.register('sudo', (a) => {
      if ((a || '').startsWith('hire-me')) {
        Term.echo('[sudo] password for visitor: ********');
        setTimeout(() => {
          Term.echo('Access granted. Opening /contact ...', 'ok');
          setTimeout(() => {
            Term.hide();
            api.current.setTermOpen(false);
            nav.current('/contact');
          }, 600);
        }, 500);
        return;
      }
      Term.echo('sudo: a password is required', 'er');
    });

    const off = onFrame((t, dt) => Term.tick(t, dt));

    /* `~` toggles it from anywhere except a field the visitor is typing in */
    const key = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (!(e.key === 'Escape' && Term.open)) return;
      }
      if (e.key === '~' || e.key === '`') {
        e.preventDefault();
        if (Term.open) { Term.hide(); api.current.setTermOpen(false); }
        else { Term.show(); api.current.setTermOpen(true); }
      }
      if (e.key === 'Escape' && Term.open) { Term.hide(); api.current.setTermOpen(false); }
    };
    window.addEventListener('keydown', key);

    return () => { off(); window.removeEventListener('keydown', key); };
  }, []);

  return (
    <div id="term" role="dialog" aria-label="Terminal">
      <div className="scanlines" aria-hidden="true" />
      <div className="term-bar">
        <span className="tdot" />
        <span className="tdot" />
        <span className="tdot" />
        <span className="mono xs tname">visitor@minhajur.dev — orbital link</span>
        <span className="sigbar mono xs" id="sigbar">▁▃▅▇▅▃</span>
        <button id="term-x" aria-label="Close terminal">×</button>
      </div>
      <div className="term-body">
        <div className="term-main">
          <div className="term-out" id="term-out" data-lenis-prevent />
          <div className="term-in">
            <span className="mono prompt">&gt;</span>
            <input
              id="term-cmd"
              className="mono"
              autoComplete="off"
              spellCheck="false"
              aria-label="Terminal command"
            />
          </div>
        </div>
        <aside className="term-side">
          <div className="radar-wrap">
            <canvas id="radar" />
            <span className="radar-cap mono">RADAR</span>
          </div>
          <div className="scan-wrap">
            <canvas id="signal-wave" />
            <span className="radar-cap mono">CHANNEL</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
