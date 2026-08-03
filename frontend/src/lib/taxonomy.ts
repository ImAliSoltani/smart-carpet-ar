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

import type { CarpetMaterial, CarpetPattern, RoomType } from "./api/types";

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

export const ROOM_LABEL: Record<RoomType, string> = {
  living_room: "پذیرایی",
  bedroom: "اتاق خواب",
  dining_room: "ناهارخوری",
  office: "اتاق کار",
  kids_room: "اتاق کودک",
  hallway: "راهرو",
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
 * Origin is deliberately absent from the navigation.
 *
 * The column mixes weaving cities with the names of the shop the demo rows were
 * taken from — «کاشان» and «نایین» sit beside «دنیای فرش» and «فرش سهند». Until
 * that is cleaned up (a recorded debt of this phase) an origin menu would put
 * another shop's name in our own header.
 */
export const ORIGIN_IN_NAV = false;
