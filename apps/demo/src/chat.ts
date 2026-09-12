const paragraphs = [
  "Teams that write with Vellum stop staring at a blank page. The first draft is already on the canvas, so the hour you used to spend warming up goes into editing, shipping, and the work that actually needed a person.",
  "Most people do not get more hours in the week. They get a copilot that remembers the brief, cuts the filler, and hands back copy that is close enough to publish. That is where the extra output comes from: less restarting, fewer tabs, fewer meetings about tone.",
  "A morning that used to hold two pieces of copy now holds five. Not because anyone typed faster, but because the model carried the repetitive parts — outlines, variants, subject lines — while the writer kept the judgment.",
  "The quiet gain is focus. When the tool drafts the obvious version, you spend your attention on the one sentence that has to be true. That is the productivity AI is actually good at: clearing the floor so the hard thinking can start sooner.",
  "Before Vellum, rewriting a landing page meant three rounds of feedback and a week of back and forth. Now the first version is close enough that the conversation is about which headline wins, not whether the draft is usable.",
  "One designer we work with said the biggest change was not speed — it was confidence. She stopped second-guessing herself because the tool gave her three angles in the time she used to spend on one. She picked the best and moved on.",
  "What surprised most teams was how much time went to starting, not finishing. The blank page was the bottleneck. Once the first paragraph existed, people edited in minutes what they used to agonize over for an hour.",
  "Productivity is not about doing more. It is about spending your attention where it matters. The model handles the predictable parts so you can focus on the sentence that actually needs a person behind it.",
  "Good writing tools do not make writers faster. They make the slow parts disappear — the outline nobody wants to do, the fifth variation of a subject line, the reformatting. What is left is the real work, and it takes exactly as long as it should.",
  "The compounding effect is subtle. Week one, you save an hour. Week four, you stop thinking about drafts altogether. The tool became part of how you write, and the old way feels like driving with the handbrake on.",
];

const GAP = 28;
const BOTTOM_PAD = 56;

export function startChat(root: HTMLElement) {
  const container = root.closest(".chat") as HTMLElement | null;
  if (!container) return;

  let targetY = 0;
  let currentY = 0;
  let rafId = 0;

  function viewH() {
    return container!.clientHeight;
  }

  function frame() {
    const diff = targetY - currentY;
    if (Math.abs(diff) < 0.4) {
      currentY = targetY;
    } else {
      currentY += diff * 0.1;
    }
    root.style.transform = `translateY(${-currentY}px)`;
    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (const text of paragraphs.slice(0, 2)) {
      root.append(makeLine(text));
    }
    return;
  }

  let index = 0;

  /** Keep the active paragraph's bottom inside the visible window. */
  function keepNodeInView(node: HTMLElement) {
    const nodeBottom = node.offsetTop + node.offsetHeight;
    const needed = nodeBottom - viewH() + BOTTOM_PAD;
    if (needed > targetY) {
      targetY = Math.max(0, needed);
    }
  }

  async function tick() {
    const full = paragraphs[index % paragraphs.length];
    index += 1;

    const node = makeLine("");
    const span = node.querySelector<HTMLElement>(".response-text");
    root.append(node);

    if (span) {
      await typeInto(span, full, () => keepNodeInView(node));
    }

    keepNodeInView(node);

    await wait(700);
    pruneOffscreen();

    await wait(1200);
    tick();
  }

  function pruneOffscreen() {
    const children = Array.from(root.children) as HTMLElement[];
    let removed = 0;

    for (const child of children) {
      const bottom = child.offsetTop + child.offsetHeight;
      if (bottom < currentY - 40) {
        removed += child.offsetHeight + GAP;
        child.remove();
      } else {
        break;
      }
    }

    if (removed > 0) {
      currentY = Math.max(0, currentY - removed);
      targetY = Math.max(0, targetY - removed);
      root.style.transform = `translateY(${-currentY}px)`;
    }
  }

  tick();

  return () => cancelAnimationFrame(rafId);
}

function makeLine(text: string) {
  const p = document.createElement("p");
  p.className = "response-line";
  const span = document.createElement("span");
  span.className = "response-text";
  span.textContent = text;
  p.append(span);
  return p;
}

async function typeInto(
  el: HTMLElement,
  full: string,
  onGrow: () => void,
) {
  el.textContent = "";
  let lastH = 0;
  for (let i = 0; i < full.length; i++) {
    el.textContent = full.slice(0, i + 1);
    const h = el.parentElement?.offsetHeight ?? 0;
    // Only nudge scroll when the paragraph actually grows taller
    // (new wrapped line), not on every character.
    if (h !== lastH) {
      lastH = h;
      onGrow();
    }
    await wait(24 + Math.random() * 20);
  }
  onGrow();
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}
