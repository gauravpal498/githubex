// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Mobile menu toggle
const toggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

toggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  toggle.setAttribute("aria-expanded", isOpen);
});

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    toggle.setAttribute("aria-expanded", false);
  });
});

// Dark mode toggle (defaults to the OS setting, remembers the visitor's choice)
const themeToggle = document.querySelector(".theme-toggle");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

function currentTheme() {
  return document.documentElement.dataset.theme || (prefersDark.matches ? "dark" : "light");
}

function updateThemeButton() {
  const isDark = currentTheme() === "dark";
  themeToggle.textContent = isDark ? "☀" : "☾";
  themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
}

themeToggle.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch (e) {}
  updateThemeButton();
});

prefersDark.addEventListener("change", updateThemeButton);
updateThemeButton();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const scrollBehavior = () => (reduceMotion.matches ? "auto" : "smooth");

// Data-to-decision flow
const flow = document.querySelector(".flow");
if (flow) setUpFlow(flow);

function setUpFlow(flow) {
  const flowLines = flow.querySelector(".flow-lines");
  const flowCaption = document.querySelector(".flow-caption");
  const flowAnnouncer = document.querySelector(".flow-announcer");
  // Keep in sync with the stacked layout breakpoint in styles.css
  const stackedLayout = window.matchMedia("(max-width: 800px)");

  const flowNode = (id) => flow.querySelector(`[data-node="${id}"]`);
  const stageNodes = (stage) => [...flow.querySelectorAll(`[data-stage="${stage}"] .flow-node`)];
  const titleOf = (node) => node.querySelector(".flow-title").textContent;

  const sources = stageNodes("sources");
  const pipeline = flowNode("pipeline");
  const insights = stageNodes("insights");
  const decisions = stageNodes("decisions");

  // Every connector in the diagram, from left to right
  const edges = [
    ...sources.map((source) => ({ from: source, to: pipeline })),
    ...insights.map((insight) => ({ from: pipeline, to: insight })),
    ...decisions.flatMap((decision) =>
      decision.dataset.uses.split(" ").map((id) => ({ from: flowNode(id), to: decision }))
    ),
  ];

  edges.forEach((edge) => {
    edge.path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    flowLines.appendChild(edge.path);
  });

  let activeDecision = null;

  function drawConnectors() {
    const box = flow.getBoundingClientRect();
    const stacked = stackedLayout.matches;

    edges.forEach((edge) => {
      const a = edge.from.getBoundingClientRect();
      const b = edge.to.getBoundingClientRect();
      let d;
      if (stacked) {
        const x1 = a.left + a.width / 2 - box.left;
        const y1 = a.bottom - box.top;
        const x2 = b.left + b.width / 2 - box.left;
        const y2 = b.top - box.top;
        const mid = (y1 + y2) / 2;
        d = `M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`;
      } else {
        const x1 = a.right - box.left;
        const y1 = a.top + a.height / 2 - box.top;
        const x2 = b.left - box.left;
        const y2 = b.top + b.height / 2 - box.top;
        const mid = (x1 + x2) / 2;
        d = `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
      }
      edge.path.setAttribute("d", d);
    });
  }

  function captionFor(decision) {
    const used = decision.dataset.uses.split(" ").map(flowNode);
    const strong = document.createElement("strong");
    strong.textContent = titleOf(decision);
    return [
      strong,
      ` ← ${used.map(titleOf).join(" + ")} ← ${sources.length} data sources, cleaned and unified`,
    ];
  }

  // `announce` is only true when the visitor picked the decision themselves,
  // so the automatic cycle never makes screen readers speak.
  function highlight(decision, announce = false) {
    activeDecision = decision;
    const used = decision.dataset.uses.split(" ").map(flowNode);
    const lineage = new Set([decision, ...used, pipeline, ...sources]);

    flow.classList.add("has-active");
    flow.querySelectorAll(".flow-node").forEach((node) => {
      node.classList.toggle("active", lineage.has(node));
    });
    decisions.forEach((node) => node.setAttribute("aria-pressed", node === decision));
    edges.forEach((edge) => {
      edge.path.classList.toggle("active", lineage.has(edge.from) && lineage.has(edge.to));
    });

    flowCaption.replaceChildren(...captionFor(decision));
    if (announce) flowAnnouncer.textContent = flowCaption.textContent;
  }

  // Cycle through the decisions until the visitor picks one, and only while
  // the diagram is on screen
  let cycleTimer = null;
  let userPicked = false;
  let onScreen = false;

  function stopCycle() {
    clearInterval(cycleTimer);
    cycleTimer = null;
  }

  function startCycle() {
    stopCycle();
    if (userPicked || !onScreen || reduceMotion.matches) return;
    cycleTimer = setInterval(() => {
      const next = (decisions.indexOf(activeDecision) + 1) % decisions.length;
      highlight(decisions[next]);
    }, 3000);
  }

  decisions.forEach((decision) => {
    decision.addEventListener("mouseenter", () => {
      stopCycle();
      highlight(decision);
    });
    decision.addEventListener("focus", () => {
      stopCycle();
      highlight(decision, true);
    });
    decision.addEventListener("click", () => {
      userPicked = true;
      stopCycle();
      highlight(decision, true);
    });
  });

  flow.addEventListener("mouseleave", () => {
    if (!flow.contains(document.activeElement)) startCycle();
  });

  flow.addEventListener("focusout", (event) => {
    if (!flow.contains(event.relatedTarget)) startCycle();
  });

  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) startCycle();
    else stopCycle();
  }).observe(flow);

  reduceMotion.addEventListener("change", startCycle);

  new ResizeObserver(drawConnectors).observe(flow);
  highlight(decisions[0]);
}

// Highlight the nav link for the section on screen
const navSections = [...navLinks.querySelectorAll('a[href^="#"]')]
  .map((link) => ({ link, section: document.querySelector(link.getAttribute("href")) }))
  .filter(({ section }) => section);

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navSections.forEach(({ link, section }) => {
        if (section === entry.target) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    });
  },
  // Only the band across the middle of the screen counts as "on screen"
  { rootMargin: "-45% 0px -50% 0px" }
);
navSections.forEach(({ section }) => sectionObserver.observe(section));

// Header shadow and back-to-top button, both driven by scroll position
const header = document.querySelector(".site-header");
const backToTop = document.querySelector(".back-to-top");

function onScroll() {
  header.classList.toggle("scrolled", window.scrollY > 8);
  backToTop.classList.toggle("visible", window.scrollY > window.innerHeight);
}

window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: scrollBehavior() });
  document.querySelector(".logo").focus({ preventScroll: true });
});

// Fade content in as it scrolls into view
if (!reduceMotion.matches) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        revealObserver.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -10% 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => {
    el.classList.add("reveal-pending");
    revealObserver.observe(el);
  });
}

// "Ask about this" buttons send the visitor to the contact form, pre-filled
function askAbout({ message }) {
  const field = form.elements.message;
  field.value = field.value.trim() ? `${field.value.trim()}

${message}` : message;
  field.dispatchEvent(new Event("input"));
  document.getElementById("contact").scrollIntoView({ behavior: scrollBehavior() });
  field.focus({ preventScroll: true });
}

document.querySelectorAll("[data-ask]").forEach((button) => {
  button.addEventListener("click", () => {
    askAbout({
      topic: button.dataset.ask,
      message: `I'd like to know more about ${button.dataset.ask}.`,
    });
  });
});

// Approach timeline (tabs: arrow keys move between steps)
const timelineTabs = [...document.querySelectorAll(".timeline-step")];
const timelinePanels = timelineTabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
const timeline = document.querySelector(".timeline");
let currentStep = 0;

function showStep(index, moveFocus = false) {
  currentStep = (index + timelineTabs.length) % timelineTabs.length;
  timelineTabs.forEach((tab, i) => {
    const selected = i === currentStep;
    tab.setAttribute("aria-selected", selected);
    tab.tabIndex = selected ? 0 : -1;
    tab.classList.toggle("done", i < currentStep);
    timelinePanels[i].hidden = !selected;
  });
  timeline.style.setProperty("--progress", currentStep / (timelineTabs.length - 1));
  timeline.querySelector('[data-step="-1"]').disabled = currentStep === 0;
  timeline.querySelector('[data-step="1"]').disabled = currentStep === timelineTabs.length - 1;
  if (moveFocus) timelineTabs[currentStep].focus();
}

timelineTabs.forEach((tab, i) => {
  tab.addEventListener("click", () => showStep(i));
  tab.addEventListener("keydown", (event) => {
    const moves = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: -1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    showStep(moves[event.key], true);
  });
});

timeline.querySelectorAll("[data-step]").forEach((button) => {
  button.addEventListener("click", () => showStep(currentStep + Number(button.dataset.step)));
});

showStep(0);

// Contact form (demo only: no backend, just shows a confirmation)
const form = document.getElementById("contact-form");
const status = document.getElementById("form-status");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = form.elements.name.value.trim();
  status.textContent = `Thanks, ${name}! We'll be in touch soon.`;
  form.reset();
});
