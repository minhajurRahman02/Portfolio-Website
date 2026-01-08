// Scroll to top on page reload
history.scrollRestoration = "manual";

window.addEventListener("load", () => {
  setTimeout(() => {
    window.scrollTo(0, 0);
  }, 10);
});


function initReveal() {
  const allReveal = Array.from(document.body.children).filter(el => {
    return !el.closest('#section-navbar') && !el.classList.contains('modal') && getComputedStyle(el).position !== 'fixed';
  });

  allReveal.forEach(el => el.classList.add('reveal'));

  function revealOnScroll() {
    allReveal.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 80) el.classList.add('visible');
    });
  }

  window.addEventListener('scroll', revealOnScroll);
  revealOnScroll(); // trigger once on load
}
initReveal();

/* ---------- FIXED TYPEWRITER ROTATING IDENTITY ---------- */
const identities = [
  "Machine Learning Researcher",
  "AI Enthusiast",
  "MERN Stack Developer",
  "Video Editor",
  "Visual Storyteller"
];

const identityEl = document.getElementById("rotating-identity");
let idx = 0;
let charIndex = 0;
let typing = true;
let pause = false;

function typeEffect() {
  if (pause) return;

  const currentText = identities[idx];

  if (typing) {
    identityEl.textContent = currentText.slice(0, charIndex++);
    if (charIndex > currentText.length) {
      typing = false;
      pause = true;
      setTimeout(() => {
        pause = false;
        typeEffect();
      }, 1200);
      return;
    }
  } else {
    identityEl.textContent = currentText.slice(0, charIndex--);

    if (charIndex < 1) {
      typing = true;
      idx = (idx + 1) % identities.length;
    }
  }

  setTimeout(typeEffect, typing ? 80 : 45);
}

setTimeout(typeEffect, 1800);



/* ---------- DARK MODE BULB SWITCH ---------- */
const darkToggle = document.getElementById("dark-toggle");

darkToggle.addEventListener("change", () => {
  if (darkToggle.checked) {
    document.body.classList.add("light-mode");
  } else {
    document.body.classList.remove("light-mode");
  }
});


/* ---------- RESEARCH MODAL SYSTEM ---------- */
/* 👇👇 PASTE THIS UNDER EVERYTHING ABOVE 👇👇 */

const cards = document.querySelectorAll('.research-card');
const modals = document.querySelectorAll('.modal');
const closes = document.querySelectorAll('.modal-close');

/* ---------- RESEARCH MODAL SYSTEM (UPDATED WITH SMOOTH OPEN/CLOSE) ---------- */

cards.forEach(card => {
  card.addEventListener("click", () => {
    const modal = document.getElementById(card.dataset.modal);
    modal.classList.remove("closing");
    modal.classList.add("active");
  });
});

closes.forEach(close => {
  close.addEventListener("click", () => {
    const modal = close.closest(".modal");
    modal.classList.add("closing");

    setTimeout(() => {
      modal.classList.remove("active", "closing");
    }, 350);
  });
});

window.addEventListener("click", e => {
  if (e.target.classList.contains("modal")) {
    e.target.classList.add("closing");
    setTimeout(() => {
      e.target.classList.remove("active", "closing");
    }, 350);
  }
});


/* ---------- END ---------- */


// Get the button
let mybutton = document.getElementById("myBtn");

// When the user scrolls down 20px from the top of the document, show the button
window.onscroll = function () { scrollFunction() };

function scrollFunction() {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    mybutton.style.display = "block";
  } else {
    mybutton.style.display = "none";
  }
}

// When the user clicks on the button, scroll to the top of the document
function topFunction() {
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
}

// skill card section

// CONFIG
const baseOverlap = 60;   // how much each card overlaps initially (px)
const hoverSpread = 180;  // how far left/right groups move on hover (px)
const cardWidth = 200;    // must match CSS .skill-card width

// DOM
const deck = document.querySelector('.skills-deck');
const skillCards = Array.from(document.querySelectorAll('.skill-card'));
if (!deck || skillCards.length === 0) throw Error('No .skills-deck or .skill-card found');

// Store initial positions so hover doesn't drift
let initialPositions = [];

// Set initial centered overlapped positions
function positionCardsInitial() {
  const n = skillCards.length;
  const deckRect = deck.getBoundingClientRect();
  const deckWidth = deckRect.width;
  const centerIndex = (n - 1) / 2;

  skillCards.forEach((card, i) => {
    const left = (deckWidth / 2) - (cardWidth / 2) + (i - centerIndex) * baseOverlap;
    card.style.left = `${left}px`;
    initialPositions[i] = left;
    card.style.zIndex = `${i}`;
  });
}


// Hover handler — move left group left, right group right, pop hovered
function onDeckHover(e) {
  const targetCard = e.target.closest('.skill-card');
  if (!targetCard) return;

  const activeIndex = skillCards.indexOf(targetCard);

  skillCards.forEach((card, i) => {
    if (i === activeIndex) {
      card.classList.add('hovered');
      card.style.left = `${initialPositions[i]}px`;
      card.style.zIndex = '999';
    } else {
      const direction = i < activeIndex ? -1 : 1;
      const initialLeft = initialPositions[i];
      card.classList.remove('hovered');
      card.style.left = `${initialLeft + direction * hoverSpread}px`;
      card.style.zIndex = `${i}`;
    }
  });
}

// Reset positions back to original
function resetDeck() {
  skillCards.forEach((card, i) => {
    card.classList.remove('hovered');
    card.style.left = `${initialPositions[i]}px`;
    card.style.zIndex = `${i}`;
  });
}

// Init and events
positionCardsInitial();
deck.addEventListener('mousemove', onDeckHover);
deck.addEventListener('mouseleave', resetDeck);

// Recenter on resize
window.addEventListener('resize', () => {
  clearTimeout(window._deckResizeTimer);
  window._deckResizeTimer = setTimeout(() => {
    positionCardsInitial();
  }, 80);
});

// project section



