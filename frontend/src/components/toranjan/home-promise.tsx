"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Camera, Cuboid, Ruler, Sparkles } from "lucide-react";

/**
 * What this shop can do, said before anything is for sale.
 *
 * The reason this block exists at all: the entrance was going to hand the
 * visitor straight to the product grid, and a grid cannot say «you can stand
 * this carpet on your own floor at its real size» — which is the entire claim
 * of the product. Someone who scrolls past seventy cards without learning that
 * has been sold a normal carpet shop.
 *
 * Every card here is a promise the shop has to keep, so each one is either
 * built or in the phase that builds it. Nothing is listed that does not exist
 * or is not next; a feature grid of intentions is a different kind of lie.
 */

const PROMISES = [
  {
    icon: Cuboid,
    title: "در خانه‌ی خودت ببین",
    body: "هر فرش با ابعاد واقعی روی کف خانه‌ی شما، از دوربین گوشی و بدون نصب هیچ برنامه‌ای.",
    href: "/carpets",
  },
  {
    icon: Camera,
    title: "با یک عکس پیدا کن",
    body: "عکسِ فرشی که پسندیده‌اید را بدهید تا نزدیک‌ترین‌ها از میان کاتالوگ پیدا شوند.",
    href: "/carpets",
  },
  {
    icon: Ruler,
    title: "اندازه را حدس نزن",
    body: "از روی عکس اتاق، اندازه‌ای که به آن فضا می‌آید پیشنهاد می‌شود.",
    href: "/carpets",
  },
  {
    icon: Sparkles,
    title: "بپرس چه فرشی می‌آید",
    body: "به زبان خودتان بگویید دنبال چه هستید — روشن، برای اتاق کودک، تا فلان قیمت.",
    href: "/carpets",
  },
] as const;

export function HomePromise() {
  const reduced = useReducedMotion();

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
      <p className="ltr-isolate mb-4 font-label text-[10.5px] uppercase tracking-[0.42em] text-muted">
        Toranjan
      </p>
      <h2 className="max-w-2xl text-2xl font-light leading-[1.7] tracking-tight sm:text-3xl">
        فرش را نمی‌شود از روی عکس خرید. اینجا لازم هم نیست.
      </h2>

      <ul className="mt-12 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {PROMISES.map((promise, index) => (
          <motion.li
            key={promise.title}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
              duration: reduced ? 0 : 0.55,
              // Staggered by position rather than all at once: the eye reads
              // them in order and the entrance follows it.
              delay: reduced ? 0 : index * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <Link href={promise.href} className="group block">
              <promise.icon className="size-5 text-accent" aria-hidden />
              <h3 className="mt-4 text-[15px]">
                <span className="bg-[linear-gradient(var(--ink),var(--ink))] bg-[length:0_1px] bg-[position:right_bottom] bg-no-repeat transition-[background-size] duration-[550ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:bg-[length:100%_1px]">
                  {promise.title}
                </span>
              </h3>
              <p className="mt-2.5 text-[13.5px] leading-loose text-muted">{promise.body}</p>
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
