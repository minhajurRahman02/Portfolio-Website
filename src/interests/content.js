/* Copy for the nine cards and their bottom sheets.
   Everything marked `draft: true` is placeholder copy written in your voice —
   replace it, then flip the flag (the sheet shows a small "draft copy" tag
   while it is true). Image slots render as labelled placeholders until you
   give them a src, either here or through mountInterests({ media: { slots } }). */

export const INTRO = {
  eyebrow: 'Interests',
  title: 'Nine places I go when I’m not working',
  sub: 'Scroll slowly. Each one is a small world, and the light changes on the way.',
};

export const OUTRO = {
  title: 'That’s all nine.',
  sub: 'Same sunrise you started with. Thanks for staying for the whole reel.',
};

export const INTERESTS = [
  {
    id: 'traveling', n: '01', icon: 'train',
    title: 'Traveling', scene: 'The Meadow Line',
    sub: 'Window seat, no fixed plan, and the long way round.',
    draft: true,
    body: [
      'I travel slowly on purpose. Trains and long bus routes give you hours with nothing to optimise, and that is where most of my better ideas have come from. The view changes, my problem doesn’t, and somewhere around the third hour it starts to look different.',
      'I rarely plan beyond the first night. The best stops so far were towns I had never heard of until a conductor or a tea-stall owner mentioned them, and the worst were the ones I researched to death.',
    ],
    highlights: [
      'Window seat, always — I will wait for the next one',
      'Plan the first night, improvise the rest',
      'One notebook per trip, mostly sketches and timings',
      'Favourite hour: the last light before a station',
    ],
    media: { kind: 'travel' },
  },
  {
    id: 'photography', n: '02', icon: 'aperture',
    title: 'Photography & Videography', scene: 'Rack Focus',
    sub: 'Available light, fog, and the few minutes after sunrise.',
    draft: true,
    body: [
      'I shoot to notice things rather than to publish them. Mostly available light, mostly within walking distance of wherever I am, and mostly in the first hour of the day, when fog flattens everything into layers.',
      'Video taught me to think in sequences instead of single frames — what comes before a shot matters as much as the shot. The portrait on this site came from one of those campus mornings.',
    ],
    highlights: [
      'Available light only; no flash in the bag',
      'Favourite focal length: a short telephoto for compression',
      'Fog, backlight, and anything with depth to rack through',
      'Short handheld clips that end up in edits later',
    ],
    media: { kind: 'gallery' },
  },
  {
    id: 'editing', n: '03', icon: 'scissors',
    title: 'Video Editing', scene: 'The Cut',
    sub: 'Premiere Pro and After Effects, mostly for things nobody commissioned.',
    draft: true,
    body: [
      'Editing is where I learned pacing. You feel a cut that is two frames late long before you can explain why, and that instinct transfers directly to how I pace a talk or sequence the figures in a paper.',
      'I cut to rhythm first and story second, then grade last, usually at night. Most of what I know about holding attention came from timelines rather than from reading about presentation.',
    ],
    highlights: [
      'Premiere Pro for the cut, After Effects for anything that moves',
      'Colour grade last, with the room dark',
      'Sound design carries half of every edit',
      'Rule I keep breaking: export, sleep, then watch again',
    ],
    media: {
      kind: 'slots',
      slots: [
        { slot: 'editing-1', ratio: '16/9', label: 'A still from a recent edit', wide: true },
        { slot: 'editing-2', ratio: '16/9', label: 'Before / after grade' },
        { slot: 'editing-3', ratio: '16/9', label: 'Timeline screenshot' },
      ],
    },
  },
  {
    id: 'gaming', n: '04', icon: 'gamepad',
    title: 'Gaming', scene: 'Mission 4: Overgrown Foundry',
    sub: 'Arcade run-and-guns raised me. Scroll to play the stage.',
    draft: true,
    pixel: true,
    body: [
      'Gaming is my oldest interest and the one I still make the most time for. Side-scrolling arcade shooters got me first — the hand-drawn explosions, the absurd difficulty, the way a whole screen of sprites somehow stayed readable.',
      'These days it is a mix of story-heavy games I play slowly and short, mechanical ones I replay to get one level clean. I notice design more than I used to: how a level teaches you without a tutorial, and how much a good hit-pause adds.',
    ],
    highlights: [
      'Favourite genre: 2D run-and-gun',
      'I replay levels for a clean run, not for the ending',
      'Weak spot: anything with a good pixel-art soundtrack',
    ],
    game: {
      stats: [['STR', 7], ['DEX', 9], ['INT', 8], ['LCK', 5]],
      cls: 'ENGINEER', lvl: 23,
      lists: [
        { title: 'Now playing', items: ['Game title — platform', 'Game title — platform', 'Game title — platform'] },
        { title: 'All-time favourites', items: ['Game title', 'Game title', 'Game title', 'Game title', 'Game title'] },
        { title: 'Retro shelf', items: ['Arcade title', 'Arcade title', 'Arcade title', 'Arcade title'] },
      ],
    },
    media: {
      kind: 'slots',
      slots: [{ slot: 'gaming-1', ratio: '16/9', label: 'Screenshot of a current favourite', wide: true }],
    },
  },
  {
    id: 'cinema', n: '05', icon: 'film',
    title: 'Movies & Music', scene: 'Hillside Cinema',
    sub: 'Films that trust the audience, and records played start to finish.',
    draft: true,
    body: [
      'I watch films for the edit and the sound as much as the story. A good score changes how long a shot can hold, and I find myself rewinding scenes to work out why a cut landed.',
      'Music is almost always on while I work. Albums, not shuffle — something instrumental for writing code, something louder for the last hour before a deadline, and film soundtracks when I need to concentrate for a long stretch.',
    ],
    highlights: [
      'Albums front to back, never shuffled',
      'Instrumental while coding, scores while writing',
      'I rewatch favourites for the editing, not the plot',
      'Outdoor screenings beat any cinema seat',
    ],
    media: {
      kind: 'slots',
      slots: [
        { slot: 'cinema-1', ratio: '2/3', label: 'Film poster' },
        { slot: 'cinema-2', ratio: '2/3', label: 'Film poster' },
        { slot: 'cinema-3', ratio: '2/3', label: 'Film poster' },
        { slot: 'cinema-4', ratio: '1/1', label: 'Album cover' },
        { slot: 'cinema-5', ratio: '1/1', label: 'Album cover' },
      ],
    },
  },
  {
    id: 'reading', n: '06', icon: 'book',
    title: 'Reading', scene: 'The Window Nook',
    sub: 'A paper a day, and a novel for the hour after.',
    draft: true,
    body: [
      'Most of my reading during the week is papers, which is work but rarely feels like it. The habit I am proudest of is the other kind: one chapter of something that has nothing to do with machine learning before I sleep.',
      'I read slowly and write in margins. Fiction for voice and pacing, popular science for how experts explain hard ideas simply, and the occasional book on design that changes how I build interfaces.',
    ],
    highlights: [
      'One non-work chapter every night',
      'Margins full of pencil notes',
      'Fiction for voice, science writing for clarity',
      'Currently reading: — (placeholder)',
    ],
    media: {
      kind: 'slots',
      slots: [
        { slot: 'reading-1', ratio: '2/3', label: 'Book cover — current read' },
        { slot: 'reading-2', ratio: '2/3', label: 'Book cover — favourite' },
        { slot: 'reading-3', ratio: '2/3', label: 'Book cover — favourite' },
      ],
    },
  },
  {
    id: 'swimming', n: '07', icon: 'wave',
    title: 'Swimming', scene: 'Through the Surface',
    sub: 'The one hour of the week with no screen in reach.',
    draft: true,
    body: [
      'Swimming is the only exercise where I cannot check anything. No phone, no notifications, just counting lengths and breathing on a rhythm, which turns out to be the closest thing I have to meditation.',
      'I am not fast. I swim for the steady middle of a session, when your stroke stops being something you think about, and for the quiet moment just under the surface before you come up for air.',
    ],
    highlights: [
      'Steady laps over speed',
      'Best thinking happens around length twenty',
      'Open water whenever I travel near some',
    ],
    media: {
      kind: 'slots',
      slots: [
        { slot: 'swimming-1', ratio: '3/2', label: 'Pool or open-water photo', wide: true },
      ],
    },
  },
  {
    id: 'food', n: '08', icon: 'bowl',
    title: 'Trying New Foods', scene: 'Twilight Market',
    sub: 'If there is a queue at the stall, I am in it.',
    draft: true,
    body: [
      'My rule when I travel is to eat at least one thing I cannot name. Street stalls and night markets are where a place’s food actually lives, and the cook is usually happy to tell you what is in it if you ask.',
      'At home it is the same habit at a smaller scale: a new restaurant over a familiar one, a dish I have never ordered, and the occasional attempt to recreate something I ate on a trip, with mixed results.',
    ],
    highlights: [
      'One unfamiliar dish per trip, minimum',
      'The stall with the queue is always worth it',
      'Ask the cook what is in it',
      'Recreating trip food at home: mixed results',
    ],
    media: {
      kind: 'slots',
      slots: [
        { slot: 'food-1', ratio: '1/1', label: 'Dish photo' },
        { slot: 'food-2', ratio: '1/1', label: 'Dish photo' },
        { slot: 'food-3', ratio: '1/1', label: 'Market or stall photo' },
      ],
    },
  },
  {
    id: 'teaching', n: '09', icon: 'chalk',
    title: 'Teaching & Mentorship', scene: 'Chalk & Stars',
    sub: 'Explaining attention maps to people who did not ask.',
    draft: true,
    body: [
      'Teaching something is the only reliable test of whether you know it. It has caught more errors in my own work than any reviewer has, usually in the moment somebody asks the obvious question I had skipped.',
      'I mentor juniors on their first research projects and run informal walkthroughs of our pipelines for anyone who wants one. The best part is watching an idea land, and the next best is when they find the hole in my explanation.',
    ],
    highlights: [
      'Peer teaching within the team',
      'Walkthroughs of the EcoVLM pipeline',
      'First-project mentoring for juniors',
      'Study groups before exams',
    ],
    media: {
      kind: 'slots',
      slots: [
        { slot: 'teaching-1', ratio: '4/3', label: 'Whiteboard from a session', wide: true },
        { slot: 'teaching-2', ratio: '4/3', label: 'Workshop or study-group photo' },
      ],
    },
  },
];

export const byId = (id) => INTERESTS.find((i) => i.id === id);
