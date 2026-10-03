"use client";

import React from "react";

/**
 * HourglassLoader
 * A packaging-themed hourglass loader with glossy black liquid falling
 * towards gravity, featuring a continuous and slower clockwise rotation.
 * 100% pure JavaScript / JSX.
 */
export default function HourglassLoader({ size = 52, label = "Loading BoxCalc…" }) {
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "14px",
        userSelect: "none",
      }}
      role="status"
      aria-label={label}
    >
      <div
        className="hg-stage"
        style={{
          width: size,
          height: (size * 66) / 50,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          viewBox="0 0 50 66"
          width="100%"
          height="100%"
          style={{ overflow: "visible", display: "block" }}
        >
          <defs>
            {/* Top bulb inner cavity clip (symmetric around cx=25, cy=33) */}
            <clipPath id="hg-top-clip">
              <path d="M 14,8 C 14,20 22,28 23,33 L 27,33 C 28,28 36,20 36,8 Z" />
            </clipPath>

            {/* Bottom bulb inner cavity clip */}
            <clipPath id="hg-bottom-clip">
              <path d="M 23,33 C 22,38 14,46 14,58 L 36,58 C 36,46 28,38 27,33 Z" />
            </clipPath>

            {/* Deep glossy black liquid gradient */}
            <linearGradient id="hg-liquid-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#27272a" />
              <stop offset="20%" stopColor="#18181b" />
              <stop offset="100%" stopColor="#09090b" />
            </linearGradient>

            {/* Glossy liquid surface sheen */}
            <linearGradient id="hg-liquid-sheen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#52525b" />
              <stop offset="50%" stopColor="#27272a" />
              <stop offset="100%" stopColor="#18181b" />
            </linearGradient>

            {/* Outer glass reflection highlight */}
            <linearGradient id="hg-glass-sheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Rotatable hourglass assembly: continuous, slower clockwise rotation */}
          <g className="hg-rotator" style={{ transformOrigin: "25px 33px" }}>
            {/* Glass translucent background */}
            <path
              d="M 14,8 C 14,20 22,28 23,33 C 22,38 14,46 14,58 L 36,58 C 36,46 28,38 27,33 C 28,28 36,20 36,8 Z"
              fill="rgba(255, 255, 255, 0.6)"
            />

            {/* 1. TOP BULB: BLACK LIQUID (drains downward towards waist) */}
            <g clipPath="url(#hg-top-clip)">
              <rect
                className="hg-liquid-top"
                x="10"
                y="8"
                width="30"
                height="26"
                fill="url(#hg-liquid-grad)"
              />
              {/* Subtle top meniscus highlight */}
              <line
                className="hg-liquid-top-meniscus"
                x1="12"
                y1="9"
                x2="38"
                y2="9"
                stroke="#52525b"
                strokeWidth="1.5"
                opacity="0.6"
              />
            </g>

            {/* 2. BLACK LIQUID STREAM & FALLING DROPLETS */}
            <g className="hg-stream-group">
              {/* Central jet-black liquid stream */}
              <line
                className="hg-stream-line"
                x1="25"
                y1="32.5"
                x2="25"
                y2="57"
                stroke="#09090b"
                strokeWidth="2.0"
                strokeLinecap="round"
              />

              {/* Individual black droplets falling towards gravity */}
              <g className="hg-droplets">
                <circle className="hg-drop hg-drop-1" cx="25" cy="35" r="1.2" fill="#09090b" />
                <circle className="hg-drop hg-drop-2" cx="25" cy="42" r="1.0" fill="#18181b" />
                <circle className="hg-drop hg-drop-3" cx="25" cy="49" r="1.3" fill="#09090b" />
              </g>
            </g>

            {/* 3. BOTTOM BULB: BLACK LIQUID (accumulates upwards) */}
            <g clipPath="url(#hg-bottom-clip)">
              <rect
                className="hg-liquid-bottom"
                x="10"
                y="32"
                width="30"
                height="27"
                fill="url(#hg-liquid-grad)"
              />
            </g>

            {/* Glass outer contour (crisp charcoal border) */}
            <path
              d="M 14,8 C 14,20 22,28 23,33 C 22,38 14,46 14,58 L 36,58 C 36,46 28,38 27,33 C 28,28 36,20 36,8 Z"
              fill="none"
              stroke="#18181b"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />

            {/* Dual glass reflection arcs for crystal clarity & 180° symmetry */}
            <path
              d="M 16,11 C 16,19 21,26 22,29"
              fill="none"
              stroke="url(#hg-glass-sheen)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M 34,55 C 34,47 29,40 28,37"
              fill="none"
              stroke="url(#hg-glass-sheen)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* Top base cap */}
            <rect
              x="8"
              y="4"
              width="34"
              height="4"
              rx="2"
              fill="#18181b"
            />

            {/* Bottom base cap */}
            <rect
              x="8"
              y="58"
              width="34"
              height="4"
              rx="2"
              fill="#18181b"
            />
          </g>
        </svg>

        <style>{`
          /* Slower, continuous clockwise rotation cycle (5.0s total)
             The rotation is strictly continuous: constantly moving clockwise,
             never frozen or stationary, with smooth, slow tempo.
          */

          .hg-rotator {
            animation: hgContinuousRotate 5.0s ease-in-out infinite;
          }

          /* Top liquid drains smoothly down towards the waist (y=33) */
          .hg-liquid-top {
            transform-origin: 25px 33px;
            animation: hgDrainLiquid 5.0s ease-in-out infinite;
          }

          /* Stream visibility while liquid is pouring */
          .hg-stream-group {
            animation: hgStreamVisibility 5.0s ease-in-out infinite;
          }

          /* Continuous stream flow texture */
          .hg-stream-line {
            stroke-dasharray: 4 2;
            animation: hgStreamPulse 0.32s linear infinite;
          }

          /* Black droplets falling rapidly downward under gravity */
          .hg-drop {
            animation: hgDropletFall 0.42s ease-in infinite;
          }
          .hg-drop-2 {
            animation-delay: 0.14s;
          }
          .hg-drop-3 {
            animation-delay: 0.28s;
          }

          /* Bottom liquid accumulates from base (y=58) upwards */
          .hg-liquid-bottom {
            transform-origin: 25px 58px;
            animation: hgFillLiquid 5.0s cubic-bezier(0.22, 0.75, 0.35, 1) infinite;
          }

          /* CONTINUOUS SLOWER CLOCKWISE ROTATION:
             Strictly monotonic clockwise turn (angle is always increasing).
             Gentle tilt during pour (0°-35°), followed by a slow, smooth,
             continuous sweep through 90°, 145°, to 180°.
             180° seamlessly loops into 0° with identical bulb symmetry.
          */
          @keyframes hgContinuousRotate {
            0% {
              transform: rotate(0deg);
            }
            18% {
              transform: rotate(10deg);
            }
            36% {
              transform: rotate(24deg);
            }
            52% {
              transform: rotate(45deg);
            }
            68% {
              transform: rotate(85deg);
            }
            82% {
              transform: rotate(135deg);
            }
            94% {
              transform: rotate(168deg);
            }
            100% {
              transform: rotate(180deg);
            }
          }

          /* TOP BLACK LIQUID DRAINS DOWNWARD */
          @keyframes hgDrainLiquid {
            0% {
              transform: scaleY(1);
              opacity: 1;
            }
            45% {
              transform: scaleY(0.08);
              opacity: 1;
            }
            54%, 100% {
              transform: scaleY(0);
              opacity: 0;
            }
          }

          /* STREAM VISIBILITY */
          @keyframes hgStreamVisibility {
            0% {
              opacity: 0;
            }
            4% {
              opacity: 1;
            }
            48% {
              opacity: 1;
            }
            55%, 100% {
              opacity: 0;
            }
          }

          /* STREAM PULSE */
          @keyframes hgStreamPulse {
            0% {
              stroke-dashoffset: 0;
            }
            100% {
              stroke-dashoffset: -12;
            }
          }

          /* DROPLETS ACCELERATING DOWNWARD UNDER GRAVITY */
          @keyframes hgDropletFall {
            0% {
              transform: translateY(-4px);
              opacity: 0;
            }
            20% {
              opacity: 1;
            }
            80% {
              opacity: 1;
            }
            100% {
              transform: translateY(14px);
              opacity: 0;
            }
          }

          /* BOTTOM BLACK LIQUID ACCUMULATES */
          @keyframes hgFillLiquid {
            0% {
              transform: scaleY(0);
              opacity: 0;
            }
            4% {
              transform: scaleY(0.05);
              opacity: 1;
            }
            52%, 100% {
              transform: scaleY(1);
              opacity: 1;
            }
          }
        `}</style>
      </div>

      {label && (
        <div
          style={{
            fontSize: "13px",
            fontWeight: "500",
            color: "var(--mute, #64748b)",
            letterSpacing: "0.01em",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
