/* Work items. `zone` decides which rail an item appears in.
   A zone showing more than THREE items grows a "See all" button
   automatically — see components/WorkZone.jsx. */

export const ZONE_LIMIT = 3;

export const work = [
  /* ---------------- research ---------------- */
  {
    id: 'ecovlm',
    zone: 'research',
    num: 'R1',
    title: 'EcoVLM',
    sub: 'A diagnostic and optimisation framework for energy-efficient vision-language model inference.',
    year: '2026',
    chip: 'ICCIT submission',
    tags: ['PyTorch', 'Zeus telemetry', 'Transformers', 'Kaggle T4'],
    featured: true,
    teaser:
      'Nobody measuring GPU energy evaluates attention pruning, and nobody pruning attention measures energy. EcoVLM bridges the two with DAP — deferral-based attention pruning across five vision-language models.',
    facts: [
      ['Result', '17% energy cut at −0.57pp accuracy'],
      ['Models', 'Qwen2.5-VL · InternVL3.5 · LLaVA-OneVision · Molmo · GLM-4.1V'],
      ['Status', 'Phase 4 · ICCIT submission'],
    ],
    kv: [
      ['17%', 'energy cut at −0.57pp acc.'],
      ['32.6%', 'peak energy reduction'],
      ['5', 'models benchmarked'],
    ],
    problem:
      'Two research streams have been running past each other. Attention-pruning work reports FLOPs, never joules. Energy-measurement work benchmarks models, never pruning methods. Nobody had measured what pruning actually costs or saves on real hardware.',
    approach:
      'EcoVLM measures GPU energy directly with Zeus telemetry under idle-power calibration, then introduces DAP — deferral-based attention pruning, which makes KEEP/DROP/DEFER decisions at three checkpoints based on attention variance instead of a single hard cut.',
    bullets: [
      'Five VLMs: Qwen2.5-VL-7B, InternVL3.5-8B, LLaVA-OneVision-7B, Molmo-7B-D, GLM-4.1V-9B-Thinking',
      'Uniform NF4 quantisation with float16 compute; 1000-sample VQAv2 subset, seed 42',
      'Headline metric is joules per correct answer, not raw energy — accuracy loss has to be paid for',
      'Architecture-gated criterion: variance beats mean (AUC 0.7102 vs 0.6403) on single-pass encoders, neutral-to-harmful on multi-crop ones',
      'InternVL3.5: 17% energy cut for 0.57pp accuracy. LLaVA-OneVision: 32.6% cut, 28.7% fewer joules per correct answer',
    ],
    stack: 'PyTorch · Transformers · bitsandbytes · Zeus · Kaggle T4 · Python',
  },
  {
    id: 'wiseup',
    zone: 'research',
    num: 'R2',
    title: 'Wise Up or Wear Down?',
    sub: 'How users respond to AI manipulation over time — inoculation, or habituation?',
    year: '2026',
    chip: 'Analysis complete',
    tags: ['HCI', 'Study design', 'Apps Script', 'Statistics'],
    featured: true,
    teaser:
      'Does repeated exposure to manipulative AI inoculate people, or wear them down? A three-session longitudinal study with a custom web testbed and a four-category manipulation taxonomy.',
    facts: [
      ['Result', 'Recognition 18.8% → 47.5%; compliance flat'],
      ['Design', '3-session longitudinal, 33 trials/session'],
      ['Status', 'Analysis complete'],
    ],
    kv: [
      ['18.8→47.5%', 'recognition, 4 weeks'],
      ['4.7→15%', 'recognition–behaviour gap'],
      ['33', 'trials per session'],
    ],
    problem:
      'Conversational AI can flatter, manufacture urgency, apply guilt and quietly expand its own remit. The open question is what repeated exposure does to people: does it inoculate them, or wear them down?',
    approach:
      'Two linked studies — a single-session baseline and a three-session longitudinal design at weeks 0, 2 and 4 — run on a purpose-built web testbed with a four-category manipulation taxonomy grounded in the CDT dark-patterns report and the ChatbotManip taxonomy.',
    bullets: [
      '33 trials per session: 8 manipulative, 24 clean, 1 attention check',
      'A minimum-read timer gates the recognition buttons so nobody can click through',
      'Session C was discarded rather than reported — a 5% attention-check pass rate made it unusable',
      'Week 0 to week 4: recognition rose 18.8% → 47.5% and false positives fell 45.8% → 30%',
      'Compliance barely moved (42.2% → 45%), so the gap between knowing and resisting widened',
    ],
    stack: 'HCI study design · Web testbed · Apps Script · Statistical analysis',
  },
  {
    id: 'phishing',
    zone: 'research',
    num: 'R3',
    title: 'Adversarial Phishing Robustness',
    sub: 'DistilBERT embeddings versus handcrafted-feature fusion under obfuscation attack.',
    year: '2026',
    chip: 'Paper in progress',
    tags: ['DistilBERT', 'GBDT', 'Adversarial ML'],
    featured: true,
    teaser:
      'What happens to a phishing detector when attackers use homoglyphs, leetspeak and zero-width characters? DistilBERT embeddings against a handcrafted-feature fusion GBDT, under attack.',
    facts: [
      ['Attacks', 'Homoglyph · leetspeak · zero-width'],
      ['Course', 'CSE 4891 Data Mining, UIU'],
      ['Status', 'Paper in progress'],
    ],
    kv: [
      ['3', 'attack families'],
      ['2', 'model architectures compared'],
    ],
    problem:
      'Phishing detectors are benchmarked on clean text. Attackers do not send clean text — they send homoglyphs, leetspeak and zero-width characters specifically designed to survive a tokeniser.',
    approach:
      'A head-to-head between DistilBERT embeddings and a handcrafted-feature fusion GBDT meta-classifier, measured not on accuracy but on how far each degrades once the obfuscation is applied.',
    bullets: [
      'Attack families: homoglyph substitution, leetspeak, zero-width injection',
      'Hybrid feature fusion against a pure-embedding baseline',
      'CSE 4891 Data Mining term paper, United International University',
    ],
    stack: 'DistilBERT · Gradient boosting · Python · Adversarial ML',
  },
  {
    id: 'vlmreview',
    zone: 'research',
    num: 'R4',
    title: 'Visual Token Pruning — Landscape',
    sub: 'A survey of 25 pruning methods for vision-language models, organised by signal type.',
    year: '2026',
    chip: 'Feeds EcoVLM',
    tags: ['Literature review', 'Taxonomy'],
    facts: [
      ['Finding', 'Attention-based is the most saturated branch — 9 of 25'],
      ['Gap', 'Energy measured on real hardware, not FLOPs proxies'],
      ['Status', "Feeds EcoVLM's related work"],
    ],
    kv: [
      ['25', 'methods catalogued'],
      ['6', 'signal families'],
      ['9', 'attention-based — the saturated branch'],
    ],
    problem:
      'Before building EcoVLM it was worth knowing what had already been tried. Visual token pruning has produced dozens of methods in a short time, and no shared frame for comparing them.',
    approach:
      'Twenty-five methods organised by the signal each one prunes on: attention, feature similarity and clustering, optimisation, entropy, learned or trained gates, and meta-level approaches.',
    bullets: [
      'Attention-based is the most crowded family — 9 of the 25',
      'The field is consolidating toward attention-free criteria',
      'The open gap: energy measured on real hardware rather than inferred from FLOPs',
      "Delivered as a landscape table feeding EcoVLM's related work",
    ],
    stack: 'Literature review · Taxonomy design · Technical writing',
  },

  /* ---------------- engineering ---------------- */
  {
    id: 'roktonet',
    zone: 'engineering',
    num: 'E1',
    title: 'RoktoNet',
    sub: 'Centralised blood inventory and allocation optimisation for Bangladesh.',
    year: '2026',
    chip: 'Live',
    live: true,
    tags: ['React', 'Flask', 'PostgreSQL', 'PuLP / CBC', 'Docker'],
    featured: true,
    teaser:
      'A MILP optimisation engine that decides how blood moves between hospitals and blood banks across Bangladesh — compatibility, urgency, expiry, distance and fairness as hard constraints. Not a donor-finder app.',
    facts: [
      ['Core', 'MILP solver — urgency, expiry, distance, fairness'],
      ['Stack', 'React/Vite · Node/Express · Flask · PostgreSQL · Docker'],
      ['Status', 'Deployed · four role dashboards complete'],
    ],
    kv: [
      ['8', 'core database tables'],
      ['551', 'thanas mapped'],
      ['4', 'role dashboards shipped'],
    ],
    problem:
      'Every blood app on the market is a donor-finder — a search box over a list of people. But a hospital network short on blood does not have a search problem. It has an allocation problem: a perishable, type-incompatible, time-critical resource has to be distributed across many hospitals and banks that are all short at once.',
    approach:
      'RoktoNet models the whole thing as a mixed-integer program. Compatibility, urgency tier, expiry window, distance and fairness all enter the solver as constraints rather than as sort keys. Donor mobilisation exists only as a fallback path when inventory genuinely cannot cover a request.',
    bullets: [
      'PuLP/CBC solver with urgency weights from 1000 (critical) down to 0.5 (restock)',
      'fulfillment_path tracks every request through inventory, donor fallback, parallel critical, scheduled reservation or mobilisation',
      'Four role dashboards: Hospital, Blood Bank, NGO, Donor — plus a shared profile layer',
      'Trigram fuzzy matching over a canonical 551-entry thana table for donor proximity',
      'Dockerised across React/Vite, Node/Express, Python/Flask and PostgreSQL on Supabase',
    ],
    stack: 'React · Vite · Tailwind · Node · Express · Flask · PuLP/CBC · PostgreSQL · Supabase · Docker',
  },
  {
    id: 'testbed',
    zone: 'engineering',
    num: 'E2',
    title: 'Manipulation Testbed',
    sub: 'The web instrument behind the HCI study — 33 trials, timed reads, auto-logging.',
    year: '2026',
    chip: 'Four sessions run',
    tags: ['JavaScript', 'Apps Script', 'Sheets API'],
    facts: [
      ['Built', 'Trial engine, read-gate timer, attention checks'],
      ['Pipeline', 'Apps Script → Sheets, per-session deployments'],
      ['Status', 'Four sessions run'],
    ],
    kv: [
      ['4', 'sessions deployed'],
      ['33', 'trials per run'],
    ],
    problem:
      'The study needed an instrument that could present manipulative and clean AI responses indistinguishably, capture recognition and compliance separately, and stop participants from speed-running the task.',
    approach:
      'A self-contained web app with a trial engine, a read-gate timer that disables the recognition controls until a minimum reading time has elapsed, embedded attention checks, and automatic logging.',
    bullets: [
      'Per-session deployments, since participant IDs regenerate without login',
      'Auto-save to Google Sheets via Apps Script',
      'A stale-build bug silently disabled the read timer; caught, fixed, and the corrected build reused',
    ],
    stack: 'JavaScript · HTML/CSS · Google Apps Script · Sheets API',
  },
  {
    id: 'portfolio',
    zone: 'engineering',
    num: 'E3',
    title: 'This site',
    sub: 'A video sky, a shader-lit hero, and one card deck I refused to give up.',
    year: '2026',
    chip: 'In build',
    tags: ['React', 'Vite', 'Tailwind', 'GSAP', 'Lenis'],
    facts: [
      ['Stack', 'React · Vite · Tailwind · GSAP · Lenis'],
      ['Detail', 'One WebGL context, scenes swapped per route'],
      ['Status', 'In build'],
    ],
    kv: [
      ['1', 'WebGL context, reused'],
      ['6', 'routes'],
    ],
    problem:
      'The previous version worked but had accumulated the usual debt: an absolute asset path that broke on any sub-path deploy, 11 MB of images for a 250-pixel avatar, a duplicated skill card and no reduced-motion handling anywhere.',
    approach:
      'A full rebuild on React, Vite and Tailwind with a single persistent WebGL context whose scenes swap per route. The one thing carried over untouched is the skill-card deck choreography.',
    bullets: [
      'One continuous sky: a smoke shader under a star, comet and planet canvas',
      'Idle for 60 seconds and the sky clears into real footage',
      'Every ambient animation pauses off-screen and collapses under prefers-reduced-motion',
      'Contact form posts to a Vercel serverless function and out through Brevo',
    ],
    stack: 'React · Vite · Tailwind · GSAP · Lenis · Vercel',
  },
];

export const byZone = (zone) => work.filter((w) => w.zone === zone);
export const byId = (id) => work.find((w) => w.id === id);
export const featured = () => work.filter((w) => w.featured);
