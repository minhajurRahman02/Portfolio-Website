/* The Interests journey. `bg` indexes into the backdrop clip set, and the
   order here is the scroll order. Each entry opens a modal whose `kind`
   decides what the body renders. */

export const backdrops = [
  'bg-01', // deep space — Milky Way
  'bg-02', // Earth from orbit, sunrise
  'bg-03', // drift among planets
  'bg-04', // sunset ridge
  'bg-05', // coastal cliffs (vertical, cover-fit)
  'bg-06', // forest glade at noon
];

/** Clips the cleared sky picks from, at random, outside /interests. */
export const skySet = ['bg-01', 'bg-02', 'sky-03', 'sky-04', 'sky-05'];

/** The Interests page has its own idle film. */
export const idleClip = 'idle';

export const galleryShots = Array.from({ length: 10 }, (_, i) =>
  `/images/gal/gal-${String(i + 1).padStart(2, '0')}.jpg`
);

export const travelShots = {
  cover: '/images/travel/travel-cover.jpg',
  caption: 'Somewhere on the Dhaka–Sylhet road',
  grid: Array.from({ length: 6 }, (_, i) => `/images/travel/travel-0${i + 1}.jpg`),
};

export const interests = [
  {
    id: 'video',
    num: '01',
    title: 'Video Editing',
    sub: 'Premiere Pro and After Effects, mostly for things nobody commissioned.',
    blurb:
      'Premiere and After Effects. Cutting to rhythm is the closest thing to writing code with your hands.',
    tags: 'Premiere Pro · After Effects · colour · sound design',
    page: [
      'Editing is where I learned pacing. You feel a cut that is two frames late long before you can explain why, and that instinct transfers directly to how a talk is paced or how a figure is sequenced in a paper.',
      'Most of what I know about holding attention came from cutting footage rather than from reading about presentation.',
    ],
    kind: 'text',
    icon: '✦',
  },
  {
    id: 'photo',
    num: '02',
    title: 'Photography',
    sub: 'Campus light, fog, and the few minutes after sunrise.',
    blurb: 'Mostly campus light and fog. The portrait on this site is from one of those mornings.',
    tags: 'available light · portraits · fog',
    page: [
      'I shoot to notice things rather than to publish them. Mostly available light, mostly within walking distance.',
    ],
    kind: 'gallery',
    icon: '◎',
  },
  {
    id: 'writing',
    num: '03',
    title: 'Writing',
    sub: 'Research notes that turn into papers, and paragraphs that turn into nothing.',
    blurb: 'Research notes that turn into papers, and paragraphs that turn into nothing.',
    tags: 'research notes · essays · IEEE drafts',
    page: [
      "Writing a method section is the fastest way to find out which part of your experiment you never actually understood. Half of EcoVLM's design decisions only became clear once I had to justify them in prose.",
    ],
    list: ['Research notes and methodology drafts', 'IEEE-format paper sections', 'Essays that stay unfinished'],
    listTitle: 'What I write',
    kind: 'text',
    icon: '✎',
  },
  {
    id: 'travel',
    num: '04',
    title: 'Travel',
    sub: 'Long bus routes, bad coffee, good conversations.',
    blurb: 'Long bus routes, bad coffee, good conversations.',
    tags: 'buses · hills · unplanned',
    page: ['Mostly inside Bangladesh, mostly without a plan beyond the first night.'],
    kind: 'travel',
    icon: '△',
  },
  {
    id: 'story',
    num: '05',
    title: 'Visual Storytelling',
    sub: 'Making a result legible is half of making it matter.',
    blurb: 'Making a result legible is half of making it matter.',
    tags: 'figures · diagrams · explainers',
    page: [
      'A 17% energy reduction means nothing until someone can see where it came from. Roughly half of the work on EcoVLM has been figures rather than code — deciding what to plot, against what baseline, at what scale.',
    ],
    list: ['Paper figures and result tables', 'Architecture and pipeline diagrams', 'Conference slides'],
    listTitle: 'Where it shows up',
    kind: 'text',
    icon: '◈',
  },
  {
    id: 'teaching',
    num: '06',
    title: 'Teaching',
    sub: 'Explaining attention maps to people who did not ask.',
    blurb: 'Explaining attention maps to people who did not ask.',
    tags: 'peer teaching · demos · study groups',
    page: [
      'Teaching something is the only reliable test of whether you know it. It has caught more errors in my own work than any reviewer has, usually in the moment somebody asks the obvious question I had skipped.',
    ],
    list: ['Peer teaching within the team', 'Walkthroughs of the EcoVLM pipeline', 'Study groups before exams'],
    listTitle: 'Usually',
    kind: 'text',
    icon: '⬡',
  },
];

export const byInterestId = (id) => interests.find((i) => i.id === id);
