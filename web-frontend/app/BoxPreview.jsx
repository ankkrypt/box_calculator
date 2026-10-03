"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import DieChart from "./DieChart";
import { lenText, unitLabel } from "./units";

/* 3D box preview with interactive flaps, X-Ray transparency, and drag/zoom inspection */
const dims = (L, W, H, unit) => `${lenText(L, unit)} × ${lenText(W, unit)} × ${lenText(H, unit)} ${unitLabel(unit)}`;

export default function BoxPreview({ type, L, W, H, J = 35, unit = "mm" }) {
  const hostRef = useRef(null);
  const zoomControlsRef = useRef(null);
  const [isInside, setIsInside] = useState(false);

  // Preserve user's camera rotation and pass-through distance across view mode toggles
  const viewStateRef = useRef({ rx: -0.45, ry: 0.7, camDist: 7.5, auto: true });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();

    // 0.15 near plane: as camera approaches any wall, that wall automatically clips away,
    // acting as an open doorway/portal so the camera passes directly through without getting stopped or blinded
    const cam = new THREE.PerspectiveCamera(35, 1, 0.15, 60);
    cam.position.set(0, 0, 7.5);

    const ren = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(ren.domElement);

    // Ambient + Key + Fill lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.88));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.75);
    d1.position.set(3, 5, 4);
    scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xffeacc, 0.45);
    d2.position.set(-3, -2, -3);
    scene.add(d2);

    // Warm interior point lights so the hollow inside cavity is clearly illuminated from within
    const innerLight1 = new THREE.PointLight(0xffecd0, 1.2, 10);
    innerLight1.position.set(0, 0, 0);
    const innerLight2 = new THREE.PointLight(0xffffff, 0.7, 8);
    innerLight2.position.set(0, 0.35, 0);

    let grp = null;
    let rx = viewStateRef.current.rx;
    let ry = viewStateRef.current.ry;
    let auto = viewStateRef.current.auto;
    let baseDist = 7.5;
    let camDist = viewStateRef.current.camDist ?? 7.5;

    const updateCamera = () => {
      viewStateRef.current.camDist = camDist;
      // Protect against 0-distance lookAt singularity
      const safeDist = Math.abs(camDist) < 0.04 ? (camDist >= 0 ? 0.04 : -0.04) : camDist;
      cam.position.set(0, 0, safeDist);
      cam.lookAt(0, 0, 0);
      cam.updateProjectionMatrix();

      // Check whether camera is inside the cavity (box max bounds ~1.6)
      const inside = Math.abs(camDist) <= 1.45;
      setIsInside(inside);
    };

    const fit = () => {
      const r = host.getBoundingClientRect();
      ren.setSize(r.width, r.height, false);
      cam.aspect = r.width / r.height;
      baseDist = 7.5 / Math.min(1, cam.aspect);
      if (viewStateRef.current.camDist == null) {
        camDist = baseDist;
      }
      updateCamera();
    };
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    fit();

    // Linear and responsive pass-through:
    // Minimum step of 0.32 units guarantees steady progress through any wall or center!
    const onWheel = e => {
      e.preventDefault();
      auto = false;
      viewStateRef.current.auto = false;

      const step = Math.max(0.32, Math.abs(camDist) * 0.14);
      if (e.deltaY < 0) {
        // Wheel forward: glide forward through walls
        camDist -= step;
      } else {
        // Wheel backward: glide backward through walls
        camDist += step;
      }
      // Clamped only at extreme bounds (±25 units) so model doesn't vanish
      camDist = Math.max(-25.0, Math.min(25.0, Math.round(camDist * 100) / 100));
      updateCamera();
    };
    host.addEventListener("wheel", onWheel, { passive: false });

    const resetView = () => {
      camDist = baseDist;
      rx = -0.45;
      ry = 0.7;
      auto = true;
      drag = false;
      activePointers.clear();
      viewStateRef.current = { rx: -0.45, ry: 0.7, camDist: baseDist, auto: true };
      if (grp) grp.rotation.set(-0.45, 0.7, 0);
      updateCamera();
      setIsInside(false);
    };

    zoomControlsRef.current = { resetView };

    let drag = false, px = 0, py = 0;
    const activePointers = new Map();
    let prevPinchDist = null;

    const down = e => {
      if (e.target && e.target.closest && e.target.closest(".zoom-controls")) {
        return;
      }
      auto = false;
      viewStateRef.current.auto = false;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { host.setPointerCapture(e.pointerId); } catch { }

      if (activePointers.size === 1) {
        drag = true;
        px = e.clientX;
        py = e.clientY;
      } else if (activePointers.size === 2) {
        drag = false;
        const pts = Array.from(activePointers.values());
        prevPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      }
    };

    const move = e => {
      if (e.target && e.target.closest && e.target.closest(".zoom-controls")) {
        return;
      }
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (prevPinchDist) {
          const delta = (dist - prevPinchDist) * 0.02;
          camDist = Math.max(-25.0, Math.min(25.0, camDist - delta));
          updateCamera();
        }
        prevPinchDist = dist;
      } else if (drag && activePointers.size === 1) {
        ry += (e.clientX - px) * .01;
        rx = Math.max(-1.45, Math.min(1.45, rx + (e.clientY - py) * .01));
        viewStateRef.current.rx = rx;
        viewStateRef.current.ry = ry;
        px = e.clientX;
        py = e.clientY;
      }
    };

    const up = e => {
      activePointers.delete(e.pointerId);
      try {
        if (host.hasPointerCapture(e.pointerId)) {
          host.releasePointerCapture(e.pointerId);
        }
      } catch { }
      if (activePointers.size < 2) {
        prevPinchDist = null;
      }
      if (activePointers.size === 1) {
        const remaining = Array.from(activePointers.values())[0];
        px = remaining.x;
        py = remaining.y;
        drag = true;
      } else {
        drag = false;
      }
    };

    host.addEventListener("pointerdown", down);
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerup", up);
    host.addEventListener("pointercancel", up);

    const slab = (a, b, c, x, y, z, parent) => {
      const g = new THREE.BoxGeometry(a, b, c);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xc99a62,
        roughness: 0.88,
        side: THREE.FrontSide, // FrontSide ensures back-facing polygons are culled, allowing camera to glide through walls without opposing faces blocking view!
      });
      const lm = new THREE.LineBasicMaterial({
        color: 0x6b4a26,
      });
      const m = new THREE.Mesh(g, mat);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), lm));
      m.position.set(x, y, z);
      (parent || grp).add(m);
      return m;
    };

    const drawBox = () => {
      if (grp) {
        grp.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        scene.remove(grp);
      }
      grp = new THREE.Group();
      grp.add(innerLight1);
      grp.add(innerLight2);
      const s = 3.2 / Math.max(L, W, H), l = L * s, w = W * s, h = H * s, t = 0.03;

      const boxType = (type || "rsc").toLowerCase();

      const tray = (l, w, h, y, solidBottom = true) => {
        if (solidBottom) {
          slab(l, t, w, 0, y - h / 2, 0);
        }
        slab(l, h, t, 0, y, w / 2);
        slab(l, h, t, 0, y, -w / 2);
        slab(t, h, w, l / 2, y, 0);
        slab(t, h, w, -l / 2, y, 0);
      };

      const flap = (sg, len, dep, y, ang) => {
        const p = new THREE.Group();
        p.position.set(0, y, sg * w / 2);
        p.rotation.x = sg * ang;
        grp.add(p);
        slab(len, t, dep, 0, 0, -sg * dep / 2, p);
      };

      const endFlap = (sg, len, dep, y, ang) => {
        const p = new THREE.Group();
        p.position.set(sg * l / 2, y, 0);
        p.rotation.z = -sg * ang;
        grp.add(p);
        slab(dep, t, len, -sg * dep / 2, 0, 0, p);
      };

      if (boxType === "rsc") {
        tray(l, w, h, 0, false);
        const endFlapDep = Math.min(w / 2, l / 2);

        // Top flaps: end flaps fold inward first, length flaps fold on top and meet at center seam
        endFlap(1, w - 2 * t, endFlapDep, h / 2 - t, 0);
        endFlap(-1, w - 2 * t, endFlapDep, h / 2 - t, 0);
        flap(1, l, w / 2, h / 2, 0);
        flap(-1, l, w / 2, h / 2, 0);

        // Bottom flaps: end flaps fold inward first, length flaps fold on top and meet at center seam
        endFlap(1, w - 2 * t, endFlapDep, -h / 2 + t, 0);
        endFlap(-1, w - 2 * t, endFlapDep, -h / 2 + t, 0);
        flap(1, l, w / 2, -h / 2, 0);
        flap(-1, l, w / 2, -h / 2, 0);

      } else if (boxType === "hsc") {
        // Half Slotted Container (open top, slotted bottom)
        tray(l, w, h, 0, false);
        const endFlapDep = Math.min(w / 2, l / 2);

        // Bottom flaps: end flaps fold inward first (y = -h/2 + t), length flaps fold outside (y = -h/2)
        endFlap(1, w - 2 * t, endFlapDep, -h / 2 + t, 0);
        endFlap(-1, w - 2 * t, endFlapDep, -h / 2 + t, 0);
        flap(1, l, w / 2, -h / 2, 0);
        flap(-1, l, w / 2, -h / 2, 0);

      } else if (boxType === "fol") {
        // Full Overlap Container (flaps overlap the full width w)
        tray(l, w, h, 0, false);
        const endFlapDep = Math.min(w, l / 2);

        // Top flaps
        endFlap(1, w - 2 * t, endFlapDep, h / 2 - t, 0);
        endFlap(-1, w - 2 * t, endFlapDep, h / 2 - t, 0);
        flap(1, l, w, h / 2, 0);
        flap(-1, l, w, h / 2 + t, 0);

        // Bottom flaps
        endFlap(1, w - 2 * t, endFlapDep, -h / 2 + t, 0);
        endFlap(-1, w - 2 * t, endFlapDep, -h / 2 + t, 0);
        flap(1, l, w, -h / 2, 0);
        flap(-1, l, w, -h / 2 - t, 0);

      } else if (boxType === "tel" || boxType === "telescope") {
        // Telescope 2-Piece Box (0320)
        // Authentic construction: Base Tray + Lid Tray with corner tabs and score lines
        const c = 2.5 * t; // clearance for lid
        const l_lid = l + 2 * c;
        const w_lid = w + 2 * c;
        const h_lid = Math.max(0.18, h * 0.42); // lid skirt height

        // Center the two-piece box assembly in the viewport
        const hoverGap = 0.14; // lifted lid view so user can clearly see 2-piece separation
        const totalH = h + hoverGap + h_lid;
        const baseY = -(totalH - h) / 2; // base center
        const lidY = baseY + h / 2 + hoverGap + h_lid / 2; // lid center

        // --- BASE TRAY ---
        // Base bottom panel
        slab(l, t, w, 0, baseY - h / 2, 0);
        // Base 4 walls
        slab(l, h, t, 0, baseY, w / 2);
        slab(l, h, t, 0, baseY, -w / 2);
        slab(t, h, w, l / 2, baseY, 0);
        slab(t, h, w, -l / 2, baseY, 0);
        // Base corner joint tabs (corner fold tabs from 0320 plus-shape die blank)
        const tabW = Math.min(0.22, l * 0.14);
        const tabH = h * 0.96;
        slab(tabW, tabH, t * 0.7, -l / 2 + tabW / 2, baseY, w / 2 + t * 0.75);
        slab(tabW, tabH, t * 0.7, l / 2 - tabW / 2, baseY, w / 2 + t * 0.75);
        slab(tabW, tabH, t * 0.7, -l / 2 + tabW / 2, baseY, -w / 2 - t * 0.75);
        slab(tabW, tabH, t * 0.7, l / 2 - tabW / 2, baseY, -w / 2 - t * 0.75);

        // --- LID TRAY (Hovered slightly above base) ---
        const lidGroup = new THREE.Group();
        grp.add(lidGroup);
        // Lid top cover panel
        slab(l_lid, t, w_lid, 0, lidY + h_lid / 2, 0, lidGroup);
        // Lid 4 skirts
        slab(l_lid, h_lid, t, 0, lidY, w_lid / 2, lidGroup);
        slab(l_lid, h_lid, t, 0, lidY, -w_lid / 2, lidGroup);
        slab(t, h_lid, w_lid, l_lid / 2, lidY, 0, lidGroup);
        slab(t, h_lid, w_lid, -l_lid / 2, lidY, 0, lidGroup);
        // Lid corner joint tabs
        const lidTabW = Math.min(0.22, l_lid * 0.14);
        const lidTabH = h_lid * 0.96;
        slab(lidTabW, lidTabH, t * 0.7, -l_lid / 2 + lidTabW / 2, lidY, w_lid / 2 + t * 0.75, lidGroup);
        slab(lidTabW, lidTabH, t * 0.7, l_lid / 2 - lidTabW / 2, lidY, w_lid / 2 + t * 0.75, lidGroup);
        slab(lidTabW, lidTabH, t * 0.7, -l_lid / 2 + lidTabW / 2, lidY, -w_lid / 2 - t * 0.75, lidGroup);
        slab(lidTabW, lidTabH, t * 0.7, l_lid / 2 - lidTabW / 2, lidY, -w_lid / 2 - t * 0.75, lidGroup);

      } else {
        // One-Piece Folder / Roll-End Tuck-Front (0427 Mailer)
        // Authentic structure: Base tray + double rollover side rims + hinged lid + front tuck flap & tabs + side dust flaps
        // Base bottom panel
        slab(l, t, w, 0, -h / 2, 0);
        // Back wall
        slab(l, h, t, 0, 0, -w / 2);
        // Front wall
        slab(l, h, t, 0, 0, w / 2);
        // Left & right side walls
        slab(t, h, w, -l / 2, 0, 0);
        slab(t, h, w, l / 2, 0, 0);

        // Rollover top creases on left & right walls (0427 double-wall feature)
        slab(t * 1.6, t, w - 2 * t, -l / 2 + t * 0.8, h / 2, 0);
        slab(t * 1.6, t, w - 2 * t, l / 2 - t * 0.8, h / 2, 0);

        // Top lid panel (hinged from back wall at y = h/2, z = -w/2)
        slab(l, t, w, 0, h / 2 + t, 0);

        // Front tuck closure flap (folds down from top lid over front wall)
        slab(l, h, t, 0, 0, w / 2 + t);

        // Front tuck locking tabs at bottom corners of front flap
        const tuckTabW = Math.min(0.24, l * 0.18);
        slab(tuckTabW, t * 1.8, t * 1.5, -l / 2 + tuckTabW / 2 + 0.04, -h / 2 + t * 0.5, w / 2 + t);
        slab(tuckTabW, t * 1.8, t * 1.5, l / 2 - tuckTabW / 2 - 0.04, -h / 2 + t * 0.5, w / 2 + t);

        // Side dust flaps / tuck-in wings (hinged from lid sides, tucked into sides)
        const wingL = w * 0.85;
        const wingH = h * 0.65;
        slab(t, wingH, wingL, -l / 2 + t * 1.7, h / 2 - wingH / 2, 0);
        slab(t, wingH, wingL, l / 2 - t * 1.7, h / 2 - wingH / 2, 0);
      }

      scene.add(grp);
    };

    drawBox();

    let raf;
    const loop = () => {
      if (grp) {
        if (auto && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) ry += .004;
        grp.rotation.set(rx, ry, 0);
      }
      ren.render(scene, cam);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerup", up);
      host.removeEventListener("pointercancel", up);
      if (grp) grp.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      ren.dispose();
      if (ren.domElement.parentNode === host) host.removeChild(ren.domElement);
    };
  }, [type, L, W, H]);

  return (
    <div className="prev" id="prev">
      <div className="die">
        <DieChart type={type} L={L} W={W} H={H} J={Number(J) || 35} />
        <small>Die cut · sheet — {unitLabel(unit)}</small>
      </div>
      <div className="stage" ref={hostRef}>
        <div className="dims">{dims(L, W, H, unit)}</div>
        <div className={`tag ${isInside ? "active-tag" : ""}`}>
          {isInside
            ? "Inside box · Drag to look around · Scroll to pass through walls"
            : "Drag to rotate"}
        </div>
        <div
          className="zoom-controls"
          onPointerDown={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
        >
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
              zoomControlsRef.current?.resetView();
            }}
            aria-label="Reset view"
            title="Reset position and view to default"
          >
            ⟲
          </button>
        </div>
      </div>
    </div>
  );
}
