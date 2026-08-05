// `use client`, and it has to be. `FeaturesGrid` animates, so it is a client
// component, and each feature here carries its icon as a *component* — a
// function. Functions do not cross the server-to-client boundary: from a
// server component this whole page failed to render with «Functions cannot be
// passed directly to Client Components». Declaring the boundary here means the
// icons are imported on the client and never serialised at all.
"use client";

import { Camera, Cuboid, Ruler, Sparkles } from "lucide-react";

import { FeaturesGrid, type Feature } from "@/components/ui/features-grid";

/**
 * What this shop can do, said before anything is for sale.
 *
 * The reason this block exists: the entrance was going to hand the visitor
 * straight to the product grid, and a grid cannot say «you can stand this
 * carpet on your own floor at its real size» — which is the entire claim of
 * the product. Someone who scrolls past seventy cards without learning that
 * has been sold an ordinary carpet shop.
 *
 * Every card is a promise the shop has to keep, so each one is either built or
 * in the phase that builds it. Nothing is listed that does not exist and is not
 * next; a feature grid of intentions is a different kind of lie.
 *
 * Three of the four still point at the catalogue, because visual search, the
 * size guide and conversational search are phase 4. When those pages exist,
 * these four hrefs are where they get linked.
 */

const PROMISES: Feature[] = [
  {
    icon: Cuboid,
    title: "در خانه‌ی خودتان ببینید",
    description:
      "هر فرش با ابعاد واقعی روی کف خانه‌ی شما، از دوربین گوشی و بدون نصب هیچ برنامه‌ای.",
    href: "/carpets",
  },
  {
    icon: Camera,
    title: "با یک عکس پیدا کنید",
    description:
      "عکسِ فرشی که پسندیده‌اید را بدهید تا نزدیک‌ترین‌ها از میان کاتالوگ پیدا شوند.",
    href: "/carpets",
  },
  {
    icon: Ruler,
    title: "اندازه را حدس نزنید",
    description: "از روی عکس اتاق، اندازه‌ای که به آن فضا می‌آید پیشنهاد می‌شود.",
    href: "/carpets",
  },
  {
    icon: Sparkles,
    title: "بپرسید چه فرشی مناسب است",
    description:
      "به زبان خودتان بگویید دنبال چه هستید — روشن، برای اتاق کودک، تا سقف قیمتی مشخص.",
    href: "/carpets",
  },
];

export function HomePromise() {
  return (
    <FeaturesGrid
      title="فرش را نمی‌شود از روی عکس خرید. اینجا لازم هم نیست."
      subtitle="پیش از آنکه چیزی بخرید، ببینید در خانه‌ی خودتان چه شکلی می‌شود."
      features={PROMISES}
    />
  );
}
