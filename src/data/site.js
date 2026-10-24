export const profile = {
  name: 'MD MINHAJUR RAHMAN',
  short: 'Minhajur',
  tagline:
    'Computer Science & Engineering student at United International University specializing in Data Science. My research focuses on optimizing Machine Learning models, with an emphasis on Vision-Language Models (VLMs). As an AI and Software Engineering enthusiast, I build high-impact applications designed to solve real-world societal challenges. I bridge the gap between intelligent backend systems and intuitive user experiences by combining system architecture optimization with modern UI/UX design.',
  availability: 'Available for any project or research collaboration',
  location: 'Dhaka, Bangladesh',
  timezone: 'Asia/Dhaka',
  email: 'rminhajur02@gmail.com',
  // Order here is the order the isometric blocks appear in on /contact.
  // Drop an entry to remove its block; add one and give it an icon + tint in
  // src/components/SocialBlocks.jsx.
  links: [
    { label: 'GitHub', href: 'https://github.com/minhajurRahman02', placeholder: 'github.com/…' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/md-minhajur-rahman-a6581834a?utm_source=share_via&utm_content=profile&utm_medium=member_android', placeholder: 'linkedin.com/in/…' },
    { label: 'Scholar', href: '', placeholder: 'scholar.google.com/…' },
    { label: 'X', href: '', placeholder: 'x.com/…' },
    { label: 'Instagram', href: 'https://www.instagram.com/_min.haz_/', placeholder: 'instagram.com/…' },
    { label: 'Facebook', href: 'https://www.facebook.com/minhajur.rahman.984349/', placeholder: 'facebook.com/…' },
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
  { value: 32, suffix: '%', label: 'peak energy saved: EcoVLM' },
  { value: 551, label: 'thanas mapped: RoktoNet' },
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
  lede: 'Building systems. Exploring intelligence. Solving real problems.',
  body: [
    'I\'m a curious, analytical, and creative problem-solver driven by a simple principle: watch, learn, and evolve. My passion for computers led me to Computer Science and Engineering, where I found the opportunity to turn curiosity into practical solutions. Today, my interests lie at the intersection of software engineering and machine learning research, with a growing focus on AI, deep learning, and vision-language models.',
    'I enjoy combining research with hands-on development to tackle real-world challenges. As the lead engineer and project manager of Roktonet, I worked on a centralized blood inventory and allocation platform for Bangladesh, including the challenge of building a blood-unit allocation engine using mixed-integer linear programming. In EcoVLM, I took on the roles of lead researcher and first author, contributing to the development of DAP (Deferred-based Adaptive Pruning), a method explored for improving the efficiency of vision-language models. Both projects reflect my interest in building systems that are not only technically sound but also meaningful in practice.',
    'Beyond technical work, I value leadership, thoughtful decision-making, and effective teamwork. Outside the world of code and research, I enjoy travelling, video editing, photography, visual storytelling, gaming, and sports. I\'m continually refining my skills, expanding my perspective, and working toward becoming a software engineer, AI researcher, and entrepreneur who makes my journey in CSE count.',
  ],
  photos: ['/images/portrait.jpg', '/images/portrait-b.jpg', '/images/portrait-c.jpg', '/images/portrait-d.jpg', '/images/portrait-e.jpg', '/images/portrait-f.jpg'],
};

export const education = [
  {
    degree: 'BSc in Computer Science & Engineering',
    school: 'United International University (UIU)',
    note: 'Research: energy-efficient VLM inference (Thesis) · Manipulative AI · Phishing Robustness · IDS · Multimodal TB Detection · Optimization',
    years: '2022 — 2027',
    flag: 'Expected', 
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
    items: ['PyTorch', 'Transformers', 'Scikit-learn', 'Pandas / NumPy', 'Quantization'],
    usedIn: ['EcoVLM', 'Phishing Robustness', 'IDS', 'TB Detection'],
  },
  {
    title: 'Databases',
    items: ['PostgreSQL', 'Supabase', 'MySQL', 'MongoDB', 'Schema design'],
    usedIn: ['RoktoNet Database'],
  },
  {
    title: 'Optimization',
    items: ['MILP modelling', 'PuLP', 'CBC solver', 'Constraint design'],
    usedIn: ['RoktoNet allocation engine'],
  },
  {
    title: 'Research\nMethods',
    items: ['Experiment design', 'Statistical analysis', 'IEEE writing', 'Literature review'],
    usedIn: ['EcoVLM', 'Wise Up or Wear Down?', 'Phishing Robustness', 'IDS', 'TB Detection'],
  },
  {
    title: 'Infrastructure',
    items: ['Docker', 'Git / GitHub', 'Linux', 'Render', 'Cloudflare Workers'],
    usedIn: ['RoktoNet deployment'],
  },
  {
    title: 'Design &\nMedia',
    items: ['Figma', 'Photoshop', 'Premiere Pro', 'After Effects'],
    usedIn: ['Personal & Professional video work', 'Project presentations'],
  },
];

export const posts = [
  {
    slug: 'attention-variance',
    status: 'Draft',
    minutes: 8,
    topic: 'EcoVLM',
    title: 'Why attention variance beats attention mean, but only on single-pass encoders?',
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
      'Every donor app treats scarcity as a matching problem. It is an allocation problem, and once expiry dates and type compatibility enter the constraints, the honest formulation is a mixed-integer program, not a sorted list.',
  },
];
