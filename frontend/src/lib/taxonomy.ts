/**
 * Persian names for the catalogue's enumerations.
 *
 * The API answers with the enum value (`lachak_toranj`), not a label, which is
 * right — a rename in the interface should never mean a migration. This is the
 * single place that turns one into the other, so the same wording reaches the
 * navigation menu, the filter panel and the product page.
 *
 * Note the case. Postgres holds the enum *name* (`LACHAK_TORANJ`) because the
 * column is a non-native SQLAlchemy enum, while Pydantic serialises the enum
 * *value*, which is lower case. Reading the taxonomy off a SQL query and typing
 * it out by hand produced the upper-case version of every one of these, and the
 * generated types rejected all of them before any of it reached a browser.
 *
 * Typed against those generated types, so removing a member in the backend
 * fails the build here rather than rendering an empty chip.
 */

import type {
  CarpetMaterial,
  CarpetPattern,
  ColorFamily,
  OrderStatus,
  RoomType,
} from "./api/types";

export const PATTERN_LABEL: Record<CarpetPattern, string> = {
  lachak_toranj: "لچک‌ترنج",
  afshan: "افشان",
  medallion: "ترنجی",
  geometric: "هندسی",
  tribal: "عشایری",
  floral: "گل‌دار",
  modern: "مدرن",
  vintage: "وینتیج",
  plain: "ساده",
};

export const MATERIAL_LABEL: Record<CarpetMaterial, string> = {
  wool: "پشم",
  silk: "ابریشم",
  cotton: "پنبه",
  acrylic: "اکریلیک",
  polyester: "پلی‌استر",
  viscose: "ویسکوز",
  mixed: "مخلوط",
};

/**
 * The colour families, named the way a carpet shop names them.
 *
 * Not a translation of the English enum members: «سرمه‌ای» is what a navy
 * carpet is called here, and «آبی» would send a shopper looking for a lighter
 * blue than the catalogue's grounds ever are. «نخودی» likewise reads as the
 * carpet colour where a literal «کرم» reads as the dessert.
 */
export const COLOR_LABEL: Record<ColorFamily, string> = {
  red: "قرمز",
  pink: "صورتی",
  orange: "نارنجی",
  gold: "طلایی",
  cream: "نخودی",
  brown: "قهوه‌ای",
  green: "سبز",
  turquoise: "فیروزه‌ای",
  blue: "سرمه‌ای",
  purple: "بنفش",
  gray: "طوسی",
  black: "مشکی",
  white: "سفید",
};

export const ROOM_LABEL: Record<RoomType, string> = {
  living_room: "پذیرایی",
  bedroom: "اتاق خواب",
  dining_room: "ناهارخوری",
  office: "اتاق کار",
  kids_room: "اتاق کودک",
  hallway: "راهرو",
};

/**
 * The three states an order moves through (ROADMAP §6-17).
 *
 * Each carries the sentence a buyer needs, not only the word. «در انتظار
 * بررسی» alone leaves someone wondering whether to wait or to call; the shop
 * is one person with a phone, so the honest label says what happens next.
 */
export const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; detail: string; tone: "waiting" | "confirmed" | "cancelled" }
> = {
  pending: {
    label: "در انتظار تأیید",
    detail: "سفارش ثبت شده و برای هماهنگی تحویل با شما تماس گرفته می‌شود.",
    tone: "waiting",
  },
  confirmed: {
    label: "تأیید شده",
    detail: "سفارش تأیید شده و برای ارسال آماده می‌شود.",
    tone: "confirmed",
  },
  cancelled: {
    label: "لغو شده",
    detail: "این سفارش لغو شده است. اگر لغو نکرده‌اید، با فروشگاه تماس بگیرید.",
    tone: "cancelled",
  },
};

/**
 * What the navigation offers, in the order the catalogue justifies.
 *
 * Ordered by how many carpets actually carry each value, counted against the
 * seeded catalogue rather than guessed — a menu whose first entry matches one
 * product teaches the visitor the wrong shape of the shop. Members with no
 * stock at all (`medallion`, `hallway`) are left out; they stay available in
 * the list page's filter panel, where an empty result is information rather
 * than a dead end.
 */
export const NAV_PATTERNS: CarpetPattern[] = [
  "lachak_toranj",
  "afshan",
  "modern",
  "geometric",
  "tribal",
  "vintage",
  "floral",
  "plain",
];

export const NAV_MATERIALS: CarpetMaterial[] = [
  "silk",
  "wool",
  "polyester",
  "acrylic",
  "viscose",
  "cotton",
];

export const NAV_ROOMS: RoomType[] = [
  "living_room",
  "bedroom",
  "dining_room",
  "office",
  "kids_room",
];

/**
 * Colour, for the filter panel only — never for the navigation menu.
 *
 * A menu entry promises a collection («فرش‌های ابریشم»), and «فرش‌های طوسی» is
 * not one: colour describes a photograph, not a category the shop is organised
 * by. In the filter panel it is the opposite — colour is often the only thing
 * a visitor can say about the carpet they have in mind.
 *
 * Ordered by how much of the catalogue each family covers, counted rather than
 * guessed, like the lists above. All thirteen are listed because the chip row
 * drops whatever the facet does not count, so a family the shop has none of
 * simply never draws.
 */
export const FILTER_COLORS: ColorFamily[] = [
  "red",
  "cream",
  "gray",
  "brown",
  "white",
  "blue",
  "orange",
  "green",
  "turquoise",
  "gold",
  "pink",
  "purple",
  "black",
];

/**
 * One swatch per family, because on this filter the word is not enough.
 *
 * Every other chip row is fully described by its label — «ابریشم» leaves
 * nothing to picture. Colour is the one where the name is a poor stand-in for
 * the thing, and where two shoppers reading «طلایی» do not picture the same
 * colour. So each chip carries a dot.
 *
 * These are **not** the colours in `Carpet.colors`. Those are read off one
 * photograph and are that carpet's own; these stand for the whole family, and
 * are chosen where the family sits in a carpet rather than where it sits on a
 * colour wheel — «سرمه‌ای» is a navy ground, not a mid blue, and «نخودی» is
 * the ivory of a Ghom field.
 */
export const COLOR_SWATCH: Record<ColorFamily, string> = {
  red: "#9b2226",
  pink: "#c2547e",
  orange: "#c2612b",
  gold: "#c99a2e",
  cream: "#e8dcc4",
  brown: "#6b4a2f",
  green: "#3e6b4a",
  turquoise: "#3e9aa3",
  blue: "#23346b",
  purple: "#6b4a80",
  gray: "#8a8a90",
  black: "#2a2a2e",
  white: "#f4f4f2",
};

/**
 * Origin is deliberately absent from the navigation.
 *
 * The column mixes weaving cities with the names of the shop the demo rows were
 * taken from — «کاشان» and «نایین» sit beside «دنیای فرش» and «فرش سهند». Until
 * that is cleaned up (a recorded debt of this phase) an origin menu would put
 * another shop's name in our own header.
 */
export const ORIGIN_IN_NAV = false;
