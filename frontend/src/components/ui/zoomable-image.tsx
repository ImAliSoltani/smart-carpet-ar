"use client";

import * as React from "react";
import Image, { type ImageProps } from "next/image";
import Zoom from "react-medium-image-zoom";
import { ImageOff } from "lucide-react";

/**
 * From [inference-sh/zoomable-image](https://21st.dev/@inference-sh/components/zoomable-image):
 * click to open a full-screen lightbox, click or scroll to close, with a
 * higher-resolution file swapped in once zoomed.
 *
 * Two things changed on the way in:
 *
 * - **`next/image`, not a bare `<img>`.** The original ships the raw tag; every
 *   photograph on this site goes through the optimizer for its `srcset` and its
 *   reserved box (ROADMAP §3-5 asks for both). The zoomed copy is deliberately
 *   *not* optimized — see `zoomSrc` below.
 * - **Its look is ours.** The library's black circle on a pure-white overlay is
 *   overridden in `globals.css`; the lightbox now stands on the same ground as
 *   the page, which is the whole argument of the museum-gallery direction.
 *
 * `zoomSrc` is the point of the component rather than a nicety. A carpet is
 * bought on its weave, and the 800px card derivative the grid uses cannot show
 * a knot. Passing the 1600px `full` derivative here means the big file is only
 * fetched by someone who asked to look closely.
 */

export interface ZoomableImageProps extends ImageProps {
  /** Render the photograph without the lightbox. */
  disabled?: boolean;
  /**
   * The file to load once zoomed, at its own resolution. Requested directly
   * rather than through the optimizer: re-encoding a photograph that exists to
   * be inspected is the one place where the optimizer costs more than it saves.
   */
  zoomSrc?: string;
  /** Gap kept between the zoomed photograph and the window edge. */
  zoomMargin?: number;
}

export function ZoomableImage({
  disabled = false,
  zoomSrc,
  zoomMargin = 24,
  onError,
  // Named rather than spread: `ImageProps` already makes it required, but the
  // a11y lint rule reads the JSX and cannot see through a spread.
  alt,
  ...imageProps
}: ZoomableImageProps) {
  const [broken, setBroken] = React.useState(false);

  if (broken) {
    return (
      <div className="flex size-full items-center justify-center text-muted">
        <ImageOff strokeWidth={1} className="size-8" aria-hidden="true" />
        <span className="sr-only">تصویر بارگذاری نشد</span>
      </div>
    );
  }

  const image = (
    <Image
      {...imageProps}
      alt={alt}
      onError={(event) => {
        setBroken(true);
        onError?.(event);
      }}
    />
  );

  if (disabled) return image;

  return (
    <Zoom
      zoomMargin={zoomMargin}
      zoomImg={zoomSrc ? { src: zoomSrc, alt } : undefined}
      a11yNameButtonZoom="بزرگ‌نمایی تصویر"
      a11yNameButtonUnzoom="بستن بزرگ‌نمایی"
    >
      {image}
    </Zoom>
  );
}

export default ZoomableImage;
