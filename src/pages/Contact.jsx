import { useRef, useState } from 'react';
import { SplitHeading } from '../components/primitives.jsx';
import SocialBlocks from '../components/SocialBlocks.jsx';
import SevenSegClock from '../components/SevenSegClock.jsx';
import { useApp } from '../context/AppState.jsx';
import Sky from '../lib/sky.js';
import { profile } from '../data/site.js';

const MAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function Contact() {
  const { toast } = useApp();
  const form = useRef(null);
  const [bad, setBad] = useState({});
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(form.current);
    // honeypot: a real visitor never sees this field, so anything in it is a bot
    if ((f.get('company') || '').toString().trim()) return;

    const name = (f.get('name') || '').toString().trim();
    const email = (f.get('email') || '').toString().trim();
    const message = (f.get('message') || '').toString().trim();

    const errs = {
      name: name.length < 2,
      email: !MAIL.test(email),
      message: message.length < 6,
    };
    setBad(errs);
    if (Object.values(errs).some(Boolean)) {
      setNote('Check the highlighted fields.');
      return;
    }

    setSending(true);
    setNote('Sending…');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      Sky.burstComets(5);
      setNote('Sent. I will reply to that address.');
      toast('Message sent ✦');
      form.current.reset();
    } catch (err) {
      // the form must never be a dead end: fall back to the address itself
      setNote(`Could not send (${err.message}). Email me directly at ${profile.email}.`);
      toast('Send failed');
    } finally {
      setSending(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      toast('Email copied');
    } catch {
      toast('Select and copy');
    }
  };

  return (
    <section className="page" data-page="contact">
      <div className="page-head">
        <p className="eyebrow mono">05 — Contact</p>
        <SplitHeading text="Say something" as="h1" big />
        <p className="lede">
          Research collaboration, engineering work, or a question about any of the above.
        </p>
      </div>

      {/* the second neumorphic zone — the controls you actually press */}
      <div className="contact-grid slab" data-zone="panel">
        <form className="cform" ref={form} onSubmit={submit} noValidate>
          <div className="fld">
            <label htmlFor="f-name">Name</label>
            <input
              id="f-name" name="name" type="text" autoComplete="name" required
              className={`neu-in${bad.name ? ' bad' : ''}`}
            />
          </div>
          <div className="fld">
            <label htmlFor="f-mail">Email</label>
            <input
              id="f-mail" name="email" type="email" autoComplete="email" required
              className={`neu-in${bad.email ? ' bad' : ''}`}
            />
          </div>
          <div className="fld">
            <label htmlFor="f-msg">Message</label>
            <textarea
              id="f-msg" name="message" rows="5" required
              className={`neu-in${bad.message ? ' bad' : ''}`}
            />
          </div>
          <input
            type="text" name="company" className="hp" tabIndex={-1}
            autoComplete="off" aria-hidden="true"
          />
          <button type="submit" className="neu-btn" data-magnetic disabled={sending}>
            {sending ? 'Sending…' : 'Send message'}
          </button>
          <p className="form-note mono xs dim">
            {note || 'Posts to a Vercel function, which hands the message to Brevo.'}
          </p>
        </form>

        <aside className="cside">
          <h3>Direct</h3>
          <p className="cside-note">
            The form reaches me fastest. Everything else is below.
          </p>
          {profile.resume
            ? <a className="btn btn-ghost" href={profile.resume} download>Download résumé</a>
            : <button className="btn btn-ghost" type="button" onClick={() => toast('Résumé PDF not supplied yet')}>Résumé</button>}
          <SevenSegClock />
        </aside>
      </div>

      {/* The blocks sit under the whole panel in one row — they are wide,
          isometric and want horizontal space, which the sidebar never had. */}
      <section className="social-row">
        <SocialBlocks onCopyEmail={copy} />
        {profile.links.some((l) => !l.href) && (
          <p className="placeholder-note mono xs">Placeholders — send me the real links.</p>
        )}
      </section>
    </section>
  );
}
