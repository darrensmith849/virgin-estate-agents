"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

/*
 * PropertyJourneyScroll — a pinned, full-screen image journey, driven by native
 * scroll. STRICTLY SEQUENTIAL: image 1, then 2, then 3 — never blended together
 * as a stack. Each image owns its own scroll window in which it runs ONE clean
 * Ken Burns breath: it zooms all the way IN, then all the way back OUT to rest.
 * Only once an image has fully zoomed out does it hand off to the next, which
 * then begins its own zoom-in. The handoff is a brief crossfade where the
 * incoming image reaches full opacity OVER the still-opaque outgoing one before
 * the outgoing drops away — so the dark stage is never exposed, and no earlier
 * image lingers underneath the later ones.
 */

// Each image's scroll window. Two equal-ish handoffs at ~1/3 and ~2/3.
//   img 1   own window 0     → 0.34
//   img 2   own window 0.34  → 0.70
//   img 3   own window 0.70  → 1.0
// At each handoff the incoming image fades up OVER the outgoing (both at rest
// scale ~1), then the outgoing — now fully covered — fades out invisibly.
const SCALE_REST = 1;
const SCALE_PEAK = 1.22; // "almost a complete zoom in" before zooming back out

const journeyImages = [
  {
    src: "/images/property-journey-exterior.jpg",
    alt: "Luxury Harare property exterior at dusk",
    label: "Exterior",
  },
  {
    src: "/images/property-journey-interior.jpg",
    alt: "Luxury Harare property, open-plan interior",
    label: "Interior",
  },
  {
    src: "/images/property-journey-detail.jpg",
    alt: "Luxury Harare property, living detail",
    label: "Detail",
  },
];

export default function PropertyJourneyScroll() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // OPACITY — each image is the sole image shown during its own window. At a
  // handoff the incoming reaches full opacity OVER the still-opaque outgoing,
  // THEN the (now hidden) outgoing fades out — so there is never a dark frame
  // and no earlier image bleeds through the later ones.
  const opacity1 = useTransform(scrollYProgress, [0, 0.34, 0.36], [1, 1, 0]);
  const opacity2 = useTransform(
    scrollYProgress,
    [0.3, 0.34, 0.7, 0.72],
    [0, 1, 1, 0],
  );
  const opacity3 = useTransform(scrollYProgress, [0.66, 0.7, 1], [0, 1, 1]);

  // SCALE — one full Ken Burns breath per image: zoom all the way IN to the
  // peak at the middle of its window, then all the way back OUT to rest before
  // the handoff, so it is fully zoomed out by the time the next image begins.
  const scale1 = useTransform(
    scrollYProgress,
    [0, 0.17, 0.34],
    [SCALE_REST, SCALE_PEAK, SCALE_REST],
  );
  const scale2 = useTransform(
    scrollYProgress,
    [0.3, 0.5, 0.7],
    [SCALE_REST, SCALE_PEAK, SCALE_REST],
  );
  const scale3 = useTransform(
    scrollYProgress,
    [0.66, 0.83, 1],
    [SCALE_REST, SCALE_PEAK, SCALE_REST],
  );

  // Index counter as an odometer: a clipped window over a 3-item column that
  // slides so exactly ONE label is ever visible (no overlapping text).
  // It rolls during each handoff window. Each step is -100%/3 of the track.
  const indexY = useTransform(
    scrollYProgress,
    [0, 0.3, 0.34, 0.66, 0.7, 1],
    ["0%", "0%", "-33.3333%", "-33.3333%", "-66.6667%", "-66.6667%"],
  );

  // Progress segments fill in turn, one per image window.
  const seg1 = useTransform(scrollYProgress, [0, 0.34], [0, 1]);
  const seg2 = useTransform(scrollYProgress, [0.34, 0.7], [0, 1]);
  const seg3 = useTransform(scrollYProgress, [0.7, 1], [0, 1]);

  if (reduceMotion) {
    return (
      <section className="property-journey-static">
        {journeyImages.map((image) => (
          <div className="property-journey-static-card" key={image.src}>
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="100vw"
              style={{ objectFit: "cover" }}
            />
            <span className="property-journey-static-label">{image.label}</span>
          </div>
        ))}
      </section>
    );
  }

  const layerStyles = [
    { opacity: opacity1, scale: scale1 },
    { opacity: opacity2, scale: scale2 },
    { opacity: opacity3, scale: scale3 },
  ];
  const segments = [seg1, seg2, seg3];

  return (
    <section
      ref={sectionRef}
      aria-label="A journey through a Virgin Estate property"
      className="property-journey-scroll"
    >
      <div className="property-journey-sticky">
        {journeyImages.map((image, i) => (
          <motion.div
            key={image.src}
            className="property-journey-layer"
            style={layerStyles[i]}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={i === 0}
              quality={90}
              sizes="100vw"
              className="property-journey-image"
            />
          </motion.div>
        ))}

        <div className="property-journey-overlay" />
        <div className="property-journey-grain" />

        <div className="property-journey-hud">
          <div className="property-journey-index">
            <motion.div
              className="property-journey-index-track"
              style={{ y: indexY }}
            >
              {journeyImages.map((image, i) => (
                <div className="property-journey-index-item" key={image.src}>
                  <span className="property-journey-num">0{i + 1}</span>
                  <span className="property-journey-word">{image.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          <div className="property-journey-progress">
            {segments.map((s, i) => (
              <span className="property-journey-progress-track" key={i}>
                <motion.i
                  className="property-journey-progress-fill"
                  style={{ scaleX: s }}
                />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
