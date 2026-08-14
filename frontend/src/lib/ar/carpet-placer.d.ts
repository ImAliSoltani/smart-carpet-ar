/**
 * The public surface of `carpet-placer.js`.
 *
 * Written by hand rather than inferred, so the file it describes can stay the
 * byte-for-byte code that was verified on a phone. Only what the page actually
 * calls is declared; the class has a good deal more on it, all of it internal.
 */

/** One purchasable size, as the placer needs it. Ascending by area. */
export interface PlacerVariant {
  /** URL of the `.glb` for *this* size — real dimensions are baked into it. */
  glb: string;
  widthCm: number;
  lengthCm: number;
  /** «۲۰۰ × ۳۰۰», already formatted; the placer never composes Persian. */
  label: string;
  price: number;
}

/** Live dimensions while the free-size mode is on. */
export interface LiveSize {
  widthCm: number;
  lengthCm: number;
  /** Percentage of the variant's real size, for «۱۱۵٪ از اندازه‌ی اصلی». */
  percent: number;
}

/**
 * Everything the overlay needs to draw itself, pushed on every change.
 *
 * `ended` arrives alone when the session closes — by the exit button, by the
 * system gesture, or because the headset/phone took the camera away. The page
 * treats it as the only signal that AR is over.
 */
export interface PlacerState {
  ended?: boolean;
  placed: boolean;
  variant: PlacerVariant;
  index: number;
  count: number;
  freeMode: boolean;
  floorTracked: boolean;
  liveSize: LiveSize | null;
  /** The real size closest to the free-mode size, so the shopper can buy it. */
  nearestStock: PlacerVariant | null;
  /** Set when a pinch tried to go past the smallest or largest real size. */
  atLimit?: "smallest" | "largest";
}

export interface CarpetPlacerOptions {
  variants: PlacerVariant[];
  initialIndex?: number;
  /** The DOM overlay root, which is also the touch surface during a session. */
  overlay: HTMLElement;
  onState?: (state: PlacerState) => void;
}

export class CarpetPlacer {
  constructor(options: CarpetPlacerOptions);
  readonly freeMode: boolean;
  /** Requests the immersive session. Rejects with a Persian message. */
  start(): Promise<void>;
  end(): Promise<void>;
  setFreeMode(enabled: boolean): void;
}
