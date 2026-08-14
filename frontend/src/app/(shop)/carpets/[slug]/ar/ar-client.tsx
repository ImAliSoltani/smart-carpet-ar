"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Hand,
  Move,
  Rotate3d,
  Ruler,
  Smartphone,
  X,
} from "lucide-react";

import { CarpetPlacer } from "@/lib/ar/carpet-placer";
import { mediaUrl } from "@/lib/api/client";
import { formatNumber, formatToman } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlacerState, PlacerVariant } from "@/lib/ar/carpet-placer";
import type { VariantOut } from "@/lib/api/types";

/**
 * Everything around the placement layer.
 *
 * Three devices arrive at this URL and only one of them can run the session:
 *
 * - **Android** has WebXR, so it gets the real thing — our gestures, our sizes.
 * - **iPhone** has no WebXR at all, and no amount of feature detection changes
 *   that. It gets Quick Look, which places the same `.usdz` at true scale and
 *   is a genuinely good experience; what it cannot do is our size-switching.
 *   Saying so plainly is better than a button that silently does nothing.
 * - **Desktop** cannot do any of it, and is where a lot of shopping happens.
 *   It gets a QR code of this exact page, so the answer to «ببینم چطور می‌شود»
 *   is a phone in the room rather than a dead end.
 *
 * The guide is shown once and remembered, because it is instructions for a
 * gesture vocabulary nobody has met before — and a modal that returns every
 * visit is one people learn to dismiss without reading.
 */

const GUIDE_SEEN_KEY = "toranjan.ar.guide-seen";
const EASE = [0.16, 1, 0.3, 1] as const;

type Platform = "webxr" | "ios" | "desktop" | "unsupported" | "unknown";

function detectPlatform(): Promise<Platform> {
  if (typeof navigator === "undefined") return Promise.resolve("unknown");

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac; the touch points are what give it away.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // Whether this is a *phone* is decided by touch, never by `navigator.xr`.
  // Desktop Chrome ships the WebXR API and answers "no" to immersive-ar, which
  // is indistinguishable from an Android phone without ARCore if you branch on
  // the API's presence — and it sent every desktop visitor to «your browser
  // does not support AR» instead of to the QR code that was the whole point.
  const handheld = navigator.maxTouchPoints > 0;
  if (isIOS) return Promise.resolve("ios");

  const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
  if (!xr?.isSessionSupported) {
    return Promise.resolve(handheld ? "unsupported" : "desktop");
  }
  return xr
    .isSessionSupported("immersive-ar")
    .then((ok): Platform => (ok ? "webxr" : handheld ? "unsupported" : "desktop"))
    .catch((): Platform => (handheld ? "unsupported" : "desktop"));
}

function QrCode() {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    // The address is read here rather than lifted into page state because it
    // is browser-only and wanted by exactly one branch. It carries whatever
    // this browser is actually at, which is what makes the code work from a
    // laptop opened at a LAN address during a demo — and correctly useless
    // from `localhost`, since a phone cannot reach the laptop's loopback.
    //
    // The encoder is imported here for the same reason: only the device that
    // cannot run AR needs it, and a phone should not download it to be told so.
    import("qrcode").then(async (QR) => {
      const png = await QR.toDataURL(window.location.href, { margin: 1, width: 320 });
      if (alive) setDataUrl(png);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!dataUrl) return <div className="size-40 animate-pulse rounded-md bg-line" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt="کد QR این صفحه" className="size-40 rounded-md" />;
}

export function ArClient({
  carpet,
  variants,
  startIndex,
}: {
  carpet: { slug: string; name: string };
  variants: VariantOut[];
  startIndex: number;
}) {
  const reduced = useReducedMotion();
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const placerRef = React.useRef<CarpetPlacer | null>(null);

  const [platform, setPlatform] = React.useState<Platform>("unknown");
  const [state, setState] = React.useState<PlacerState | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showGuide, setShowGuide] = React.useState(false);

  React.useEffect(() => {
    detectPlatform().then(setPlatform);
  }, []);

  const placerVariants: PlacerVariant[] = React.useMemo(
    () =>
      variants.map((v) => ({
        glb: mediaUrl(v.glb_url) ?? "",
        widthCm: v.width_cm,
        lengthCm: v.length_cm,
        label: `${formatNumber(v.width_cm)} × ${formatNumber(v.length_cm)}`,
        price: Number(v.price),
      })),
    [variants],
  );

  const begin = React.useCallback(async () => {
    if (!overlayRef.current) return;
    setError(null);
    const placer = new CarpetPlacer({
      variants: placerVariants,
      initialIndex: startIndex,
      overlay: overlayRef.current,
      onState: (next) => setState(next.ended ? null : next),
    });
    placerRef.current = placer;
    try {
      await placer.start();
      if (typeof window !== "undefined" && !localStorage.getItem(GUIDE_SEEN_KEY)) {
        setShowGuide(true);
        localStorage.setItem(GUIDE_SEEN_KEY, "1");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "واقعیت افزوده شروع نشد.");
      placerRef.current = null;
    }
  }, [placerVariants, startIndex]);

  const usdz = variants[startIndex]?.usdz_url ?? variants[0]?.usdz_url;
  const inSession = state !== null;

  return (
    <>
      {/* The overlay is mounted always and shown only during a session: WebXR
          takes this element as its `domOverlay` root at request time, so it has
          to exist before the session is asked for, not after. */}
      <div
        ref={overlayRef}
        className={cn(
          "fixed inset-0 z-50 flex-col justify-between",
          inSession ? "flex" : "hidden",
        )}
        style={{ touchAction: "none", userSelect: "none" }}
      >
        <ArOverlay
          state={state}
          onExit={() => placerRef.current?.end()}
          onToggleFree={() => {
            const placer = placerRef.current;
            if (placer) placer.setFreeMode(!placer.freeMode);
          }}
        />
      </div>

      <main className="mx-auto w-full max-w-[820px] px-5 pb-28 sm:px-8">
        <header className="py-12 sm:py-16">
          <Link
            href={`/carpets/${carpet.slug}`}
            className="inline-flex items-center gap-2 text-sm text-muted transition-colors duration-[--dur-feedback] hover:text-ink"
          >
            <ArrowRight className="size-4" />
            بازگشت به صفحه‌ی فرش
          </Link>
          <h1 className="mt-6 text-[clamp(1.6rem,4vw,2.6rem)] font-light leading-[1.3] tracking-[-0.02em]">
            {carpet.name}
          </h1>
          <p className="mt-4 max-w-[46ch] text-[15px] leading-[2.1] text-muted">
            با ابعاد واقعی روی کف خانه‌ی خودتان. بدون نصب هیچ برنامه‌ای.
          </p>
        </header>

        {variants.length === 0 ? (
          <div className="rounded-lg border border-line bg-paper p-10 text-center shadow-panel">
            <p className="text-lg">فایل واقعیت افزوده‌ی این فرش هنوز آماده نیست.</p>
            <p className="mt-3 text-sm leading-loose text-muted">
              فایل‌ها خودکار ساخته می‌شوند و معمولاً چند دقیقه بعد از افزوده شدن فرش
              آماده‌اند.
            </p>
            <Link
              href={`/carpets/${carpet.slug}`}
              className="mt-6 inline-block rounded-full bg-cta px-6 py-2.5 text-sm text-on-cta transition-colors duration-[--dur-feedback] hover:bg-cta-hover"
            >
              بازگشت به فرش
            </Link>
          </div>
        ) : (
          <>
            {platform === "webxr" && (
              <div className="rounded-lg border border-line bg-paper p-8 shadow-raised">
                <Gestures />
                <button
                  type="button"
                  onClick={begin}
                  className="mt-8 h-14 w-full rounded-full bg-cta text-base text-on-cta shadow-panel transition-all duration-[--dur-feedback] hover:-translate-y-px hover:shadow-raised active:translate-y-0 active:scale-[0.99] active:shadow-none motion-reduce:transform-none"
                >
                  شروع واقعیت افزوده
                </button>
                <p className="mt-4 text-center text-xs leading-loose text-muted">
                  دوربین فقط تا وقتی این صفحه باز است کار می‌کند و هیچ تصویری
                  ذخیره یا ارسال نمی‌شود.
                </p>
              </div>
            )}

            {platform === "ios" && usdz && (
              <div className="rounded-lg border border-line bg-paper p-8 shadow-raised">
                {/* `rel="ar"` with a single child is what makes Safari hand the
                    file to Quick Look instead of downloading it. */}
                <a
                  rel="ar"
                  href={mediaUrl(usdz)}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-cta text-base text-on-cta shadow-panel transition-all duration-[--dur-feedback] hover:shadow-raised active:scale-[0.99]"
                >
                  <span>دیدن روی کف خانه</span>
                </a>
                <p className="mt-5 text-sm leading-loose text-muted">
                  روی آیفون، واقعیت افزوده با Quick Look اپل باز می‌شود.
                  جای‌گذاری و <b className="font-medium text-ink">مقیاس واقعی</b>{" "}
                  کار می‌کند؛ جابه‌جایی بین سایزها و حالت اندازه‌ی دلخواه فعلاً
                  فقط روی اندروید در دسترس است.
                </p>
              </div>
            )}

            {platform === "desktop" && (
              <div className="rounded-lg border border-line bg-paper p-8 shadow-raised">
                <div className="flex flex-wrap items-center gap-8">
                  <QrCode />
                  <div className="min-w-[16rem] flex-1">
                    <p className="flex items-center gap-2 text-lg">
                      <Smartphone className="size-5 text-accent" />
                      این کد را با گوشی اسکن کنید
                    </p>
                    <p className="mt-4 text-sm leading-loose text-muted">
                      واقعیت افزوده به دوربین نیاز دارد، پس روی رایانه اجرا
                      نمی‌شود. کد بالا همین فرش و همین سایز را روی گوشی باز
                      می‌کند.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {platform === "unsupported" && (
              <div className="rounded-lg border border-line bg-paper p-8 shadow-panel">
                <p className="text-base leading-loose">
                  مرورگر این دستگاه از واقعیت افزوده پشتیبانی نمی‌کند.
                </p>
                <p className="mt-3 text-sm leading-loose text-muted">
                  روی اندروید با Chrome و روی آیفون با Safari امتحان کنید.
                </p>
              </div>
            )}

            {platform === "unknown" && (
              <div className="h-40 animate-pulse rounded-lg border border-line bg-paper" />
            )}

            {error && (
              <p className="mt-5 text-sm leading-loose text-destructive" role="alert">
                {error}
              </p>
            )}

            <section className="mt-12">
              <h2 className="text-sm text-muted">
                {formatNumber(variants.length)} سایز آماده‌ی نمایش
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {variants.map((v, i) => (
                  <li
                    key={v.id}
                    className={cn(
                      "rounded-full border px-4 py-2 text-xs",
                      i === startIndex
                        ? "border-ink bg-cta text-on-cta"
                        : "border-line text-muted",
                    )}
                  >
                    {formatNumber(v.width_cm)} × {formatNumber(v.length_cm)}
                    {/* A separator, not a margin. Two Persian numerals side by
                        side run together as one long number to the eye, and
                        «۸۰ × ۱۲۰ ۶۷,۴۰۰,۰۰۰» is unreadable however much space
                        is between them. */}
                    <span className="mx-2 opacity-40">·</span>
                    <span className="opacity-70">{formatToman(v.price)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>

      <AnimatePresence>
        {showGuide && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-4 sm:items-center"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            onClick={() => setShowGuide(false)}
          >
            <motion.div
              role="dialog"
              aria-label="راهنمای واقعیت افزوده"
              className="w-full max-w-[420px] rounded-lg bg-paper p-7 shadow-raised"
              initial={reduced ? false : { y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduced ? undefined : { y: 16, opacity: 0 }}
              transition={{ duration: 0.36, ease: EASE }}
              onClick={(event) => event.stopPropagation()}
            >
              <Gestures />
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="mt-7 h-12 w-full rounded-full bg-cta text-sm text-on-cta transition-all duration-[--dur-feedback] active:scale-[0.98]"
              >
                فهمیدم
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** The gesture vocabulary, said the same way before and during the session. */
function Gestures() {
  const rows = [
    { icon: Hand, text: "روی صفحه بزنید تا فرش روی کف قرار بگیرد" },
    { icon: Move, text: "یک انگشت: فرش را روی کف بکشید" },
    { icon: Rotate3d, text: "دو انگشت، چرخشی: فرش را بچرخانید" },
    { icon: Ruler, text: "دو انگشت، باز و بسته: سایز بعدیِ موجود" },
  ];
  return (
    <ul className="space-y-4">
      {rows.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-start gap-3 text-sm leading-loose">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border border-line bg-bg">
            <Icon className="size-4 text-accent" />
          </span>
          {text}
        </li>
      ))}
    </ul>
  );
}

/**
 * The panel drawn over the camera feed.
 *
 * Only the two buttons take touches; everything else is transparent to them,
 * because the carpet is placed and dragged by touching anywhere on the screen
 * and a text panel that swallowed a drag would make the rug stick.
 */
function ArOverlay({
  state,
  onExit,
  onToggleFree,
}: {
  state: PlacerState | null;
  onExit: () => void;
  onToggleFree: () => void;
}) {
  // `beforexrselect` is the event that stops a tap on a control *also* counting
  // as a tap on the floor behind it. Without it, exiting moves the carpet.
  const stopSelect = React.useCallback(
    (node: HTMLButtonElement | null) => {
      if (!node) return;
      const block = (event: Event) => event.preventDefault();
      node.addEventListener("beforexrselect", block);
      return () => node.removeEventListener("beforexrselect", block);
    },
    [],
  );

  if (!state) return null;

  const { placed, variant, index, count, freeMode, floorTracked, liveSize, nearestStock } =
    state;

  return (
    <>
      <button
        ref={stopSelect}
        type="button"
        onClick={onExit}
        aria-label="بستن واقعیت افزوده"
        className="absolute top-4 start-4 grid size-12 place-items-center rounded-full bg-ink/80 text-white backdrop-blur"
        style={{ pointerEvents: "auto" }}
      >
        <X className="size-5" />
      </button>

      <div
        className="mx-auto mt-4 max-w-[90vw] rounded-full bg-ink/80 px-5 py-3 text-center text-sm leading-loose text-white backdrop-blur"
        style={{ pointerEvents: "none" }}
      >
        {!placed ? (
          floorTracked ? (
            "کف شناسایی شد — هرجای صفحه بزنید"
          ) : (
            <>
              روی صفحه بزنید تا فرش قرار بگیرد
              <span className="block opacity-70">
                گوشی را آرام چپ و راست بگردانید تا کف بهتر شناسایی شود
              </span>
            </>
          )
        ) : freeMode && liveSize ? (
          <>
            <b className="text-accent">
              {formatNumber(liveSize.widthCm)} × {formatNumber(liveSize.lengthCm)}
            </b>
            <span className="block opacity-75">
              {formatNumber(liveSize.percent)}٪ از اندازه‌ی اصلی
            </span>
            {nearestStock && (
              <span className="block opacity-75">
                نزدیک‌ترین سایز موجود: {nearestStock.label}
              </span>
            )}
          </>
        ) : (
          <>
            <b className="text-accent">{variant.label} سانتی‌متر</b>
            <span className="block">{formatToman(variant.price)}</span>
            <span className="block opacity-70">
              سایز {formatNumber(index + 1)} از {formatNumber(count)}
            </span>
          </>
        )}
      </div>

      <div className="mb-6 flex flex-col items-center gap-3" style={{ pointerEvents: "none" }}>
        {placed && (
          <>
            <p className="max-w-[90vw] rounded-xl bg-ink/70 px-4 py-2.5 text-center text-xs leading-loose text-white backdrop-blur">
              {freeMode
                ? "حالت اندازه‌گیری: با دو انگشت ببینید چه ابعادی به اتاق می‌خورد. این اندازه لزوماً موجود نیست."
                : "روی فرش انگشت بگذارید و بکشید · دو انگشت: چرخش و تغییر سایز"}
            </p>
            <button
              ref={stopSelect}
              type="button"
              onClick={onToggleFree}
              className={cn(
                "rounded-full px-6 py-3 text-sm font-medium transition-colors",
                freeMode ? "bg-confirm-tint text-confirm-tint-ink" : "bg-accent text-white",
              )}
              style={{ pointerEvents: "auto" }}
            >
              {freeMode ? "بازگشت به سایزهای فروشگاه" : "اندازه‌ی دلخواه"}
            </button>
          </>
        )}
      </div>
    </>
  );
}
