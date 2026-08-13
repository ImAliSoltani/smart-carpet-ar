/**
 * The intro film, as a thing that can be started and stopped.
 *
 * This is the prototype in `docs/prototypes/intro/chaptered.html` with the DOM
 * taken out of it. Every rule in here was arrived at by watching the prototype
 * fail in a particular way, and the reasoning is recorded next to each one
 * rather than in a document nobody opens.
 *
 * It is deliberately not a React component and holds no React state. A frame
 * sequence runs on `requestAnimationFrame` and mutates a dozen values sixty
 * times a second; putting any of that in `useState` re-renders a tree per frame
 * for numbers nothing renders. React owns *when this exists*; it owns what it
 * does while it does.
 */

export interface IntroCallbacks {
  /** Prompt under the film — «اسکرول کن», the readiness percentage, and so on. */
  onCue: (text: string) => void;
  /** Chapters completed, 0…CHAPTERS. Drives the dots and the announcement. */
  onChapter: (chapter: number, total: number) => void;
  /** The brand wordmark shows only once the carpet is finished. */
  onTitle: (visible: boolean) => void;
  /** Watched through, skipped, or abandoned — the shop is owed the screen. */
  onFinish: () => void;
}

const FRAMES = 137;

/**
 * Where the film is allowed to rest: the five supplied stills, located in the
 * footage at 0.0s, 5.1s, 10.0s, 14.1s and 18.2s. Resting at even intervals
 * instead lands the eye on a half-composed shot.
 */
const STOPS = [0, 38, 75, 105, 136];
const CHAPTERS = STOPS.length - 1;

/** Speed, not duration — otherwise a long chapter looks rushed beside a short one. */
const MS_PER_FRAME = 42;
const DUR_MIN = 500;
const DUR_MAX = 3200;

/** Fetch order is «what is needed next», so a chapter is skeletoned then filled. */
const COARSE_STEP = 4;

/**
 * A decoded 1920×1080 frame is about 8 MB. Keeping all 137 is over a gigabyte,
 * which shows up as stutter long before it shows up as a crash.
 */
const KEEP_RADIUS = 22;

/** If the opening chapter cannot be assembled in this long, there is no film. */
const READY_BUDGET_MS = 5000;

const AVIF_PROBE =
  "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAIAAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAQAAAAEAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAKG1kYXQSAAoIGAAGiAhoNCAyEh/3h4UV3///4s/AAJA1jjx+3A==";

function supportsAvif(): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve(probe.width > 0);
    probe.onerror = () => resolve(false);
    probe.src = AVIF_PROBE;
  });
}

const easeInOut = (k: number) =>
  k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

export class IntroEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly cb: IntroCallbacks;

  private images: (ImageBitmap | null)[] = new Array(FRAMES).fill(null);
  private ready: boolean[] = new Array(FRAMES).fill(false);
  private inFlight = new Map<number, Promise<void>>();

  private set = "webp-1280";
  private ext = ".webp";
  private motionSet: string | null = null;

  private current = 0;
  private chapter = 0;
  private playing = false;
  private armed = false;
  private staticMode = false;
  private pendingGesture = 0;
  private queued = 0;
  private rate = 1;
  private raf = 0;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, callbacks: IntroCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("canvas 2d context unavailable");
    this.ctx = ctx;
    this.cb = callbacks;
  }

  get chapterCount() {
    return CHAPTERS;
  }

  /** True once the opening chapter can actually be played through. */
  get isArmed() {
    return this.armed;
  }

  private src(i: number) {
    const pad = String(i).padStart(3, "0");
    // In hybrid mode the five resting frames come from the full-quality set and
    // everything between them from a lighter one. The eye stops only at the
    // rests; the rest are on screen for a twentieth of a second while the
    // camera moves, which is where compression is invisible.
    if (this.motionSet && !STOPS.includes(i)) {
      return `/intro/${this.motionSet}/f-${pad}.avif`;
    }
    return `/intro/${this.set}/f-${pad}${this.ext}`;
  }

  private async chooseSet() {
    const avif = await supportsAvif();
    const need = window.innerWidth * (window.devicePixelRatio || 1);
    const width = need > 1400 ? 1920 : 1280;

    if (avif) {
      this.set = `avif-${width}`;
      this.ext = ".avif";
      // The motion set is chosen against the screen, not against the stop set:
      // 960 is the phone's set, and a 1280-wide laptop asking for the stops at
      // 1280 should not then be fed 960px motion frames. The threshold sits
      // just under a laptop and just over the widest phone.
      this.motionSet = need > 1000 ? "motion-1280" : "motion-960";
    } else {
      // One width for the fallback, deliberately. This path is only reached by
      // a browser too old to decode AVIF, and it fetches all 137 frames because
      // there is no motion set to pair it with — so a second width would be the
      // largest folder built for the smallest audience. `webp-1920` is not
      // shipped at all; the prune step in `extract_intro_frames.py` deletes it,
      // and asking for it here would be asking for a 404.
      this.set = "webp-1280";
      this.ext = ".webp";
      this.motionSet = null;
    }
  }

  private load(i: number): Promise<void> {
    if (this.ready[i]) return Promise.resolve();
    const existing = this.inFlight.get(i);
    if (existing) return existing;

    const job = (async () => {
      try {
        const response = await fetch(this.src(i));
        if (!response.ok) return;
        // Decoding off the main thread. An <img> hands the browser a compressed
        // file and the decode lands wherever — with AVIF that is expensive
        // enough to stall the very animation it is feeding.
        const bitmap = await createImageBitmap(await response.blob());
        if (this.destroyed) {
          bitmap.close?.();
          return;
        }
        this.images[i] = bitmap;
        this.ready[i] = true;
      } catch {
        /* a missing frame is survivable: nearest() covers the gap */
      } finally {
        this.inFlight.delete(i);
      }
    })();

    this.inFlight.set(i, job);
    return job;
  }

  private evict() {
    for (let i = 0; i < FRAMES; i += 1) {
      if (!this.ready[i] || Math.abs(i - this.current) <= KEEP_RADIUS) continue;
      this.images[i]?.close?.();
      this.images[i] = null;
      this.ready[i] = false;
    }
  }

  private chapterRange(i: number): [number, number] {
    const from = STOPS[Math.max(0, Math.min(CHAPTERS, i))];
    const to = STOPS[Math.max(0, Math.min(CHAPTERS, i + 1))];
    return [Math.min(from, to), Math.max(from, to)];
  }

  private async loadCoarse(i: number) {
    if (i < 0 || i >= CHAPTERS || this.destroyed) return;
    const [from, to] = this.chapterRange(i);
    const picks: number[] = [];
    for (let f = from; f <= to; f += COARSE_STEP) picks.push(f);
    if (picks[picks.length - 1] !== to) picks.push(to);

    for (let n = 0; n < picks.length; n += 1) {
      if (this.destroyed) return;
      await this.load(picks[n]);
      this.draw();
      if (i === 0 && !this.armed) {
        const pct = Math.round(((n + 1) / picks.length) * 100);
        this.cb.onCue(`در حال آماده‌سازی — ${pct}٪`);
      }
    }
  }

  private async loadFill(i: number) {
    if (i < 0 || i >= CHAPTERS || this.destroyed) return;
    const [from, to] = this.chapterRange(i);
    for (let f = from; f <= to; f += 1) {
      if (this.destroyed) return;
      if (this.ready[f]) continue;
      await this.load(f);
      if (!this.playing) this.draw(); // never repaint underneath a running chapter
    }
  }

  private prioritise(chapterIndex: number) {
    this.evict();
    void this.loadCoarse(chapterIndex)
      .then(() => this.loadCoarse(chapterIndex + 1))
      .then(() => this.loadFill(chapterIndex))
      .then(() => this.loadFill(chapterIndex + 1));
  }

  private nearest(i: number): ImageBitmap | null {
    const clamped = Math.max(0, Math.min(FRAMES - 1, i));
    if (this.ready[clamped]) return this.images[clamped];
    for (let d = 1; d < FRAMES; d += 1) {
      if (this.ready[clamped - d]) return this.images[clamped - d];
      if (this.ready[clamped + d]) return this.images[clamped + d];
    }
    return null;
  }

  /** Never draw larger than the frame really is, or compression reads as noise. */
  fit() {
    const first = this.images.find(Boolean);
    const sourceW = first ? first.width : 1920;
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      Math.max(1, sourceW / window.innerWidth),
    );
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    this.draw();
  }

  private paint(img: ImageBitmap | null, alpha: number) {
    if (!img) return;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    // Whole frame, no crop.
    const scale = Math.min(cw / img.width, ch / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    this.ctx.globalAlpha = alpha;
    this.ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    this.ctx.globalAlpha = 1;
  }

  private draw() {
    this.ctx.fillStyle = "#07060a";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const base = Math.floor(this.current);
    const frac = this.current - base;
    this.paint(this.nearest(base), 1);
    if (frac > 0.02) this.paint(this.nearest(base + 1), frac);
  }

  private play(to: number) {
    const from = this.current;
    const goal = STOPS[Math.max(0, Math.min(STOPS.length - 1, to))];
    const duration = Math.max(
      DUR_MIN,
      Math.min(DUR_MAX, Math.abs(goal - from) * MS_PER_FRAME),
    );
    let elapsed = 0;
    let last = performance.now();
    this.rate = 1;
    this.playing = true;
    this.cb.onCue("");

    const step = (t: number) => {
      if (this.destroyed) return;
      // A scroll during playback raises `rate` instead of being dropped, so the
      // film hurries to the next resting point and the gesture still counts.
      elapsed += (t - last) * this.rate;
      last = t;
      const k = Math.min(1, elapsed / duration);
      this.current = from + (goal - from) * easeInOut(k);
      this.draw();
      if (k < 1) {
        this.raf = requestAnimationFrame(step);
        return;
      }

      this.current = goal;
      this.playing = false;
      this.rate = 1;
      this.draw();

      if (this.queued !== 0) {
        const dir = Math.sign(this.queued);
        this.queued -= dir;
        this.advance(dir);
        return;
      }

      this.cb.onCue(to >= CHAPTERS ? "برای ورود به فروشگاه ادامه بده" : "ادامه بده");
      this.cb.onTitle(to >= CHAPTERS);
    };

    this.raf = requestAnimationFrame(step);
  }

  private advance(dir: number) {
    if (dir > 0 && this.chapter >= CHAPTERS) {
      this.finish();
      return;
    }
    const next = Math.max(0, Math.min(CHAPTERS, this.chapter + dir));
    if (next === this.chapter) {
      this.queued = 0;
      return;
    }
    this.chapter = next;
    this.cb.onChapter(this.chapter, CHAPTERS);
    this.prioritise(Math.min(this.chapter, CHAPTERS) - (dir > 0 ? 1 : 0));
    this.play(this.chapter);
  }

  /** One wheel flick, one arrow key, one swipe — all arrive here. */
  gesture(dir: number) {
    if (this.destroyed) return;
    if (this.staticMode) {
      this.finish();
      return;
    }
    if (!this.armed) {
      this.pendingGesture = dir; // held, not dropped
      return;
    }
    if (!this.playing) {
      this.advance(dir);
      return;
    }
    // Mid-chapter: keep the intent and hurry the film rather than dropping it.
    this.queued = Math.max(-2, Math.min(2, this.queued + dir));
    this.rate = Math.min(this.rate * 2.2, 7);
  }

  private arm() {
    this.armed = true;
    this.cb.onCue("ادامه بده");
    if (this.pendingGesture) {
      const dir = this.pendingGesture;
      this.pendingGesture = 0;
      this.gesture(dir);
    }
  }

  /**
   * A four-chapter sequence cannot stream in real time on a slow link. Rather
   * than show a broken film, it is abandoned and the closing frame — the
   * finished carpet under light — is shown as a still.
   */
  private goStatic() {
    if (this.staticMode) return;
    this.staticMode = true;
    this.armed = true;
    this.cb.onCue("برای ورود به فروشگاه ادامه بده");
    this.cb.onTitle(true);
    this.cb.onChapter(CHAPTERS, CHAPTERS);
    void this.load(FRAMES - 1).then(() => {
      this.current = FRAMES - 1;
      this.draw();
    });
    if (this.pendingGesture) {
      this.pendingGesture = 0;
      this.finish();
    }
  }

  private linkLooksSlow() {
    const c = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (!c) return false; // Firefox has no such API — the budget below measures instead
    if (c.saveData) return true;
    return ["slow-2g", "2g", "3g"].includes(c.effectiveType ?? "");
  }

  async boot(force?: "play" | "static" | null) {
    await this.chooseSet();
    if (this.destroyed) return;

    if (force !== "play" && (force === "static" || this.linkLooksSlow())) {
      this.fit();
      this.goStatic();
      return;
    }

    this.cb.onCue("در حال آماده‌سازی");
    await this.load(0); // one picture is all the first paint needs
    if (this.destroyed) return;
    this.fit();

    // Measured, not guessed. Firefox has no connection API, so this budget is
    // the only reliable signal either way.
    const budget = new Promise<"timeout">((r) =>
      setTimeout(() => r("timeout"), READY_BUDGET_MS),
    );
    const outcome = await Promise.race([
      this.loadCoarse(0).then(() => "ready" as const),
      budget,
    ]);
    if (this.destroyed) return;
    if (outcome === "timeout") {
      this.goStatic();
      return;
    }

    this.arm();
    void this.loadFill(0);
  }

  finish() {
    if (this.destroyed) return;
    this.cb.onFinish();
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    for (let i = 0; i < FRAMES; i += 1) {
      this.images[i]?.close?.();
      this.images[i] = null;
      this.ready[i] = false;
    }
    this.inFlight.clear();
  }
}
