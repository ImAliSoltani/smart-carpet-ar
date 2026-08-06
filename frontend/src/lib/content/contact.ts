/**
 * The ways to reach the shop — in one place, empty until they are real.
 *
 * §6-12 of the roadmap asks for WhatsApp and Instagram, because that is how a
 * small Iranian shop is actually reached. They are accounts this shop does not
 * have yet, and the footer already settled what to do about that: keep them as
 * empty constants rather than plausible-looking URLs, because a broken contact
 * link is worse than a missing one — the visitor spends a click and their
 * willingness to try, and gets nothing.
 *
 * What changed here is only where the decision lives. The footer held its own
 * copy; now the footer, the contact page and anything after them read the same
 * four values, so filling them in is one edit to this file rather than a search
 * through the pages that happen to mention them.
 *
 * Formats, so the day these are filled in nobody has to guess:
 * - `whatsapp` — international digits, no `+` and no spaces: `989120000000`.
 * - `instagram` — the handle alone, no `@` and no URL: `toranjan.rugs`.
 * - `email` — a plain address.
 * - `phone` — as a person would dial it, in Persian or latin figures. It is
 *   shown exactly as written and dialled after `dialable` below folds and
 *   strips it.
 */

export type ContactId = "whatsapp" | "instagram" | "phone" | "email";

export const CONTACT: Record<ContactId, string> = {
  whatsapp: "",
  instagram: "",
  phone: "",
  email: "",
};

/**
 * The digits of a `tel:` href, from a number written either way.
 *
 * `\D` means «not an ASCII digit», so stripping with it alone turns
 * «۰۲۱ ۱۲۳۴ ۵۶۷۸» into an empty string and the link into a `tel:` that dials
 * nothing — silently, because the label still reads correctly. Found by filling
 * these constants in and looking at the rendered href. Persian and Arabic-Indic
 * figures are folded to latin first, so the constant may be written in whichever
 * script the person filling it in has to hand.
 */
function dialable(written: string): string {
  return written
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");
}

export type ContactChannel = {
  id: ContactId;
  /** What it is called, in Persian. */
  label: string;
  /** What this channel is good for — the reason to pick it over the others. */
  note: string;
  /** What the visitor sees. Latin values need `.ltr-isolate` at the call site. */
  display: string;
  href: string;
  /** Latin text reorders inside an RTL line unless it is isolated. */
  latin: boolean;
};

/** Only the channels that have somewhere to go. */
export function contactChannels(): ContactChannel[] {
  const { whatsapp, instagram, phone, email } = CONTACT;
  const channels: ContactChannel[] = [];

  if (whatsapp) {
    channels.push({
      id: "whatsapp",
      label: "واتس‌اپ",
      note: "سریع‌ترین راه. عکس اتاق یا فرشی که پسندیده‌اید را همان‌جا بفرستید.",
      display: `+${whatsapp}`,
      href: `https://wa.me/${whatsapp}`,
      latin: true,
    });
  }

  if (instagram) {
    channels.push({
      id: "instagram",
      label: "اینستاگرام",
      note: "فرش‌های تازه و نماهای نزدیک از بافت و نقش.",
      display: `@${instagram}`,
      href: `https://instagram.com/${instagram}`,
      latin: true,
    });
  }

  if (phone) {
    channels.push({
      id: "phone",
      label: "تلفن",
      note: "برای وقتی که ترجیح می‌دهید حرف بزنید.",
      display: phone,
      // `tel:` wants digits and nothing else; the display keeps its spacing.
      href: `tel:${dialable(phone)}`,
      latin: false,
    });
  }

  if (email) {
    channels.push({
      id: "email",
      label: "ایمیل",
      note: "برای پیام‌های بلندتر و پیوست.",
      display: email,
      href: `mailto:${email}`,
      latin: true,
    });
  }

  return channels;
}
