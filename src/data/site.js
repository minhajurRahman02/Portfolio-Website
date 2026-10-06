/* ============================================================
   Everything editable about the site lives in this folder.
   Add a project, a post or an interest by adding an object —
   no component changes required.
   ============================================================ */

export const profile = {
  name: 'MD MINHAJUR RAHMAN',
  short: 'Minhajur',
  // TODO(minhajur): replace with your own words
  tagline:
    'CSE at United International University. I work on making vision-language models cheaper to run, on optimisation systems for healthcare logistics, and on how people respond to manipulative AI.',
  availability: 'Available for research collaboration',
  location: 'Dhaka, Bangladesh',
  timezone: 'Asia/Dhaka',
  // TODO(minhajur): real addresses
  email: 'your.email@example.com',
  // Order here is the order the isometric blocks appear in on /contact.
  // Drop an entry to remove its block; add one and give it an icon + tint in
  // src/components/SocialBlocks.jsx.
  links: [
    { label: 'GitHub', href: '', placeholder: 'github.com/…' },
    { label: 'LinkedIn', href: '', placeholder: 'linkedin.com/in/…' },
    { label: 'Scholar', href: '', placeholder: 'scholar.google.com/…' },
    { label: 'X', href: '', placeholder: 'x.com/…' },
    { label: 'Instagram', href: '', placeholder: 'instagram.com/…' },
    { label: 'Facebook', href: '', placeholder: 'facebook.com/…' },
  ],
  resume: '', // e.g. '/minhajur-rahman-cv.pdf'
};

export const identities = [
  'AI Enthusiast',
  'Machine Learning Researcher',
  'Software Engineer',
  'MERN Stack Developer',
  'Video Editor',
  'Visual Storyteller',
];

export const stats = [
  { value: 4, label: 'active projects' },
  { value: 2, label: 'papers in progress' },
  { value: 32, suffix: '%', label: 'peak energy saved — EcoVLM' },
  { value: 551, label: 'thanas mapped — RoktoNet' },
];

export const routes = [
  { key: 'home', path: '/', label: 'Home' },
  { key: 'work', path: '/work', label: 'Work' },
  { key: 'about', path: '/about', label: 'About' },
  { key: 'blog', path: '/blog', label: 'Blog' },
  { key: 'contact', path: '/contact', label: 'Contact' },
  { key: 'interests', path: '/interests', label: 'Interests' },
];

export const about = {
  // TODO(minhajur): replace with your own words
  lede: 'I am a final-year CSE student at United International University, and most of my time goes to three questions.',
  body: [
    'How much energy does a vision-language model actually waste on tokens it did not need? That is EcoVLM, and the answer so far is roughly a third of it, depending on the encoder.',
    'How should a country allocate a perishable, type-incompatible, time-critical resource like blood across hospitals that are all short at once? That is RoktoNet, and it turns out to be a mixed-integer program.',
    'And what happens to people who are repeatedly exposed to an AI that flatters, rushes and guilt-trips them? That is the HCI study, and the uncomfortable finding is that people get better at spotting manipulation without getting better at resisting it.',
  ],
  photos: ['/images/portrait.jpg', '/images/portrait-b.jpg', '/images/portrait-c.jpg'],
};

export const education = [
  {
    degree: 'BSc in Computer Science & Engineering',
    school: 'United International University (UIU)',
    note: 'Research: energy-efficient VLM inference · HCI · optimisation',
    years: '2022 — 2026',
    flag: 'confirm status', // TODO(minhajur): graduated or expected?
  },
  {
    degree: 'Higher Secondary Certificate',
    school: 'St. Joseph Higher Secondary School · Science',
    result: 'GPA 5.00 / 5.00',
    years: '2021',
  },
  {
    degree: 'Secondary School Certificate',
    school: 'Jatrabari Ideal School & College · Science',
    result: 'GPA 5.00 / 5.00',
    years: '2019',
  },
];

export const skills = [
  {
    title: 'Programming\nLanguages',
    items: ['C / C++', 'Python', 'Java', 'JavaScript', 'SQL', 'Assembly'],
    usedIn: ['EcoVLM', 'RoktoNet', 'Phishing Robustness'],
  },
  {
    title: 'Web\nDevelopment',
    items: ['React + Vite', 'Node / Express', 'Tailwind', 'REST APIs', 'HTML / CSS'],
    usedIn: ['RoktoNet', 'HCI web testbed', 'This site'],
  },
  {
    title: 'Machine\nLearning',
    items: ['PyTorch', 'Transformers', 'Scikit-learn', 'Pandas / NumPy', 'Quantisation'],
    usedIn: ['EcoVLM', 'Phishing Robustness'],
  },
  {
    title: 'Databases',
    items: ['PostgreSQL', 'Supabase', 'MySQL', 'MongoDB', 'Schema design'],
    usedIn: ['RoktoNet — 8 core tables'],
  },
  {
    title: 'Optimisation',
    items: ['MILP modelling', 'PuLP', 'CBC solver', 'Constraint design'],
    usedIn: ['RoktoNet allocation engine'],
  },
  {
    title: 'Research\nMethods',
    items: ['Experiment design', 'Statistical analysis', 'IEEE writing', 'Literature review'],
    usedIn: ['EcoVLM', 'Wise Up or Wear Down?', 'Phishing Robustness'],
  },
  {
    title: 'Infrastructure',
    items: ['Docker', 'Git / GitHub', 'Linux', 'Render', 'Cloudflare Workers'],
    usedIn: ['RoktoNet deployment'],
  },
  {
    title: 'Design &\nMedia',
    items: ['Figma', 'Photoshop', 'Premiere Pro', 'After Effects'],
    usedIn: ['Personal video work', 'Project presentations'],
  },
];

export const posts = [
  {
    slug: 'attention-variance',
    status: 'Draft',
    minutes: 8,
    topic: 'EcoVLM',
    title: 'Why attention variance beats attention mean — but only on single-pass encoders',
    excerpt:
      "Variance predicted token importance at AUC 0.7102 against the mean's 0.6403 on Qwen and GLM. On the multi-crop models it was neutral at best and harmful at worst. The architecture decides the criterion, and that turned out to be the whole finding.",
  },
  {
    slug: 'knowing-vs-doing',
    status: 'Draft',
    minutes: 6,
    topic: 'HCI',
    title: 'People learned to spot the manipulation. They complied anyway.',
    excerpt:
      'Over four weeks recognition more than doubled and false positives fell. Compliance moved by three points. The gap between knowing and doing widened from 4.7% to 15%, which is not the story anyone wanted to find.',
  },
  {
    slug: 'not-a-search-problem',
    status: 'Draft',
    minutes: 11,
    topic: 'Optimisation',
    title: 'A blood bank is not a search problem',
    excerpt:
      'Every donor app treats scarcity as a matching problem. It is an allocation problem — and once expiry dates and type compatibility enter the constraints, the honest formulation is a mixed-integer program, not a sorted list.',
  },
];
