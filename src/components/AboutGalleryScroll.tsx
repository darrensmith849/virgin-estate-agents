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
 * AboutGalleryScroll — a pinned image journey for the About page, driven by
 * native scroll. STRICTLY SEQUENTIAL: image 1, then 2, then 3 — never blended
 * together as a stack. Each image owns its own scroll window in which it runs
 * ONE clean Ken Burns breath: it zooms all the way IN, then all the way back
 * OUT to rest. Only once an image has fully zoomed out does it hand off to the
 * next, which then begins its own zoom-in. The handoff is a brief crossfade
 * where the incoming image reaches full opacity OVER the still-opaque outgoing
 * one before the outgoing drops away — so the stage is never exposed, and no
 * earlier image lingers underneath the later ones.
 */

const SCALE_REST = 1;
const SCALE_PEAK = 1.22; // "almost a complete zoom in" before zooming back out

const EXISTING_IMAGE =
  "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=2880&q=85";

const galleryImages = [
  {
    src: EXISTING_IMAGE,
    alt: "Modern glass villa with terrace and pool",
    label: "Architecture",
  },
  {
    src: "/images/about-villa-pool.jpg",
    alt: "Contemporary white villa with pool and palms",
    label: "The grounds",
  },
  {
    src: "/images/about-villa-garden.jpg",
    alt: "Modern villa with pool, deck and garden",
    label: "Poolside",
  },
];

export default function AboutGalleryScroll() {
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

  // Minimal caption odometer (clipped slide → never overlaps).
  const captionY = useTransform(
    scrollYProgress,
    [0, 0.3, 0.34, 0.66, 0.7, 1],
    ["0%", "0%", "-33.3333%", "-33.3333%", "-66.6667%", "-66.6667%"],
  );

  if (reduceMotion) {
    return (
      <section className="about-gallery-static">
        {galleryImages.map((image) => (
          <div className="about-gallery-static-card" key={image.src}>
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="100vw"
              style={{ objectFit: "cover" }}
            />
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

  return (
    <section
      ref={sectionRef}
      aria-label="A look at the homes we represent"
      className="about-gallery"
    >
      <div className="about-gallery-sticky">
        {galleryImages.map((image, i) => (
          <motion.div
            key={image.src}
            className="about-gallery-layer"
            style={layerStyles[i]}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={i === 0}
              quality={90}
              sizes="100vw"
              className="about-gallery-image"
            />
          </motion.div>
        ))}

        <div className="about-gallery-overlay" />

        <div className="about-gallery-hud">
          <div className="about-gallery-caption">
            <motion.div
              className="about-gallery-caption-track"
              style={{ y: captionY }}
            >
              {galleryImages.map((image) => (
                <span className="about-gallery-caption-item" key={image.src}>
                  {image.label}
                </span>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="about-gallery-progress">
          <motion.i style={{ scaleX: scrollYProgress }} />
        </div>
      </div>
    </section>
  );
}
