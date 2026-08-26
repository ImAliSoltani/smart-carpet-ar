"use client";

import { useQuery } from "@tanstack/react-query";

import { ImageAccordion, type AccordionPanel } from "@/components/ui/image-accordion";
import { facetsQuery } from "@/lib/api/catalog";
import { formatNumber } from "@/lib/format";
import { NAV_ROOMS, ROOM_LABEL } from "@/lib/taxonomy";
import type { RoomType } from "@/lib/api/types";
import bedroom from "../../../public/brand/room-card-bedroom.webp";
import diningRoom from "../../../public/brand/room-card-dining-room.webp";
import kidsRoom from "../../../public/brand/room-card-kids-room.webp";
import livingRoom from "../../../public/brand/room-card-living-room.webp";
import office from "../../../public/brand/room-card-office.webp";

/**
 * The last thing on the home page: five rooms, each a photograph.
 *
 * It was five empty boxes with a word in the middle of each. On a page whose
 * entire argument is «see the carpet on your own floor» — a page that opens
 * with a room the visitor furnishes themselves — ending with five text boxes
 * that ask «which room?» without showing a single room was the weakest thing
 * on it, and the brand brief's own rule says the photograph is meant to be the
 * loudest element of every screen.
 *
 * **The photographs are the shop's own.** Every carpet in the catalogue was
 * shot in the room it is *for* (`catalog_profiles.py` writes each prompt from
 * that carpet's first room), so a picture of a real dining room with a real
 * catalogue carpet in it already existed for all five. A stock room would have
 * shown a carpet nobody can buy here; these show one that is one click away,
 * behind the very filter the panel links to. Which five, and why those, is in
 * `public/brand/README.md`.
 *
 * **The counts are read, not written.** «۲۴ فرش» comes from the same facets
 * the filter panel counts with, so a room that gains or loses stock says so by
 * itself and no number here can go stale. Until they arrive the line is simply
 * absent — a skeleton for a five-word line would be more motion than the fact
 * is worth, and the panel is a link either way.
 */

const ROOM_PHOTO: Partial<Record<RoomType, AccordionPanel["image"]>> = {
  living_room: livingRoom,
  bedroom,
  dining_room: diningRoom,
  office,
  kids_room: kidsRoom,
};

/** What the photograph shows, for whoever cannot see it. */
const ROOM_ALT: Partial<Record<RoomType, string>> = {
  living_room: "پذیرایی با مبل سبز و فرش لچک‌ترنج سرمه‌ای روی پارکت",
  bedroom: "اتاق خواب با تخت چوبی و فرش گل‌فرنگ کرم",
  dining_room: "ناهارخوری با میز چوبی و فرش گل‌فرنگ روی پارکت",
  office: "اتاق کار با میز و قفسه‌ی کتاب و فرش هندسی قرمز",
  kids_room: "اتاق کودک با تخت و میز کوچک و فرش فیروزه‌ای",
};

export function HomeRooms() {
  const { data } = useQuery(facetsQuery());

  const panels: AccordionPanel[] = NAV_ROOMS.filter((room) => ROOM_PHOTO[room]).map(
    (room) => {
      const count = data?.rooms?.[room];
      return {
        key: room,
        title: ROOM_LABEL[room],
        meta: count ? `${formatNumber(count)} فرش` : undefined,
        href: `/carpets?room=${room}`,
        image: ROOM_PHOTO[room]!,
        alt: ROOM_ALT[room] ?? ROOM_LABEL[room],
      };
    },
  );

  return (
    /* Deliberately not `toranjan-rise`. That class animates on load, and
       everything on this page below the fold is behind the cinematic intro
       while it plays — the entrance would run, finish, and be over before the
       visitor ever saw this section. */
    <section className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8">
      <h2 className="mb-8 border-t border-line pt-8 text-xl font-bold tracking-tight sm:text-2xl">
        برای کدام اتاق؟
      </h2>
      {/* Rooms rather than patterns: someone arriving at a carpet shop knows
          which room is empty long before they know what a lachak-toranj is.
          The pattern names are in the header's menu, for whoever does. */}
      <ImageAccordion panels={panels} openLabel="دیدن فرش‌های این اتاق" />
    </section>
  );
}
