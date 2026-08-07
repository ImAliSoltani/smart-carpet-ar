import type { CarpetDetail } from "@/lib/api/types";
import { absoluteMediaUrl } from "@/lib/api/client";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { MATERIAL_LABEL, PATTERN_LABEL } from "@/lib/taxonomy";

/**
 * The product, in the vocabulary a search engine reads (ROADMAP §۶-۱۳).
 *
 * The page already says all of this in Persian prose, which is what a person
 * reads; this says the same thing in schema.org, which is what decides whether
 * the result carries a price and an in-stock line or is just a blue link.
 *
 * **One `Product` with an `AggregateOffer`, not one product per size.** Every
 * size shares a name, a photograph and a pattern — four `Product` entries for
 * one carpet is the shape that gets a shop flagged for duplicate listings. The
 * sizes are the offers, and each is a real `Offer` with its own price, its own
 * availability, and an `sku` that matches the variant id in our own database,
 * so a report about «SKU 312» can be answered with a query.
 *
 * Prices are strings from the API — `Decimal` on the backend, deliberately not
 * parsed early (`lib/api/types.ts`) — but they cannot be passed straight
 * through. Pydantic serialises a `Decimal` however Python's `repr` feels, and
 * for the larger sizes that is **scientific notation**: the 105,300,000-toman
 * variant arrives as `"1.0530E+8"`. A validator reads that as a malformed price
 * and drops the offer, so every rich result on the shop would have quietly gone
 * missing. `rials()` below is the whole fix, and it is why the number is
 * normalised here rather than trusted.
 *
 * `dangerouslySetInnerHTML` is how a `<script type="application/ld+json">` is
 * written in React; there is no other way to put a raw string in a script tag.
 * Nothing here is user input — every field comes from our own database through
 * a typed client — and the one character that could close the tag early is
 * escaped below.
 */
/**
 * A price the way schema.org wants it: plain digits, and in the currency the
 * code beside it actually names.
 *
 * **Two conversions, not one.**
 *
 * Digits first. `Number()` reads `"1.0530E+8"` and `"4700000.00"` alike, and
 * `toFixed(0)` writes both back as digits. Rounding is not a concern — the
 * catalogue tops out near 250 million, well inside what a double holds exactly.
 *
 * Then the unit, which is the one that would have been embarrassing. The
 * catalogue stores **toman** (`lib/format.ts` says so, and the whole shop
 * renders «… تومان»), but ISO 4217 has no code for toman — Iran's currency code
 * is `IRR`, the **rial**, and a rial is a tenth of a toman. Publishing the
 * stored number under `IRR` would have told every search engine that a
 * 67-million-toman carpet costs 67 million rial: the shop underselling itself
 * by a factor of ten in the one place a price is read by a machine.
 */
function rialsFromToman(toman: string | number): string {
  return (Number(toman) * 10).toFixed(0);
}

export function ProductSchema({ carpet }: { carpet: CarpetDetail }) {
  const url = new URL(`/carpets/${carpet.slug}`, SITE_URL).toString();

  const images = carpet.images
    .map((image) => absoluteMediaUrl(image.full_url ?? image.url))
    .filter((src): src is string => Boolean(src));

  const offers = carpet.variants.map((variant) => ({
    "@type": "Offer",
    url,
    sku: `${carpet.slug}-${variant.id}`,
    name: `${variant.width_cm}×${variant.length_cm} سانتی‌متر`,
    price: rialsFromToman(variant.price),
    priceCurrency: "IRR",
    availability:
      variant.stock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
  }));

  const prices = carpet.variants.map((variant) => Number(variant.price));

  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: carpet.name,
    description: carpet.description ?? undefined,
    url,
    ...(images.length ? { image: images } : {}),
    brand: { "@type": "Brand", name: SITE_NAME },
    ...(carpet.origin ? { countryOfOrigin: "IR" } : {}),
    material: MATERIAL_LABEL[carpet.material],
    pattern: PATTERN_LABEL[carpet.pattern],
    ...(offers.length
      ? {
          offers: {
            "@type": "AggregateOffer",
            offerCount: offers.length,
            lowPrice: rialsFromToman(Math.min(...prices)),
            highPrice: rialsFromToman(Math.max(...prices)),
            priceCurrency: "IRR",
            offers,
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      // `<` is escaped so a name containing «</script>» cannot end the block
      // early. Nothing in the catalogue does, and a shopkeeper typing it into
      // the admin panel one day should get a strange product name rather than a
      // broken page.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
