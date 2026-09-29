"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import DieChart from "./DieChart";
import { lenText, unitLabel } from "./units";

/* 3D box preview ported from the sample page. Drag to rotate. */
const dims = (L, W, H, unit) => `${lenText(L, unit)} × ${lenText(W, unit)} × ${lenText(H, unit)} ${unitLabel(unit)}`;
export default function BoxPreview({ type, L, W, H, unit = "mm" }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(35, 1, .1, 50);
    cam.position.set(0, 0, 7.5);
    const ren = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(ren.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, .75));
    const d = new THREE.DirectionalLight(0xffffff, .7);
    d.position.set(3, 5, 4);
    scene.add(d);

    let grp = null, rx = -0.45, ry = 0.7, auto = true;
    const fit = () => {
      const r = host.getBoundingClientRect();
      ren.setSize(r.width, r.height, false);
      cam.aspect = r.width / r.height;
      cam.position.z = 8.5 / Math.min(1, cam.aspect);
      cam.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    fit();

    let drag = false, px = 0, py = 0;
    const down = e => { drag = true; auto = false; px = e.clientX; py = e.clientY; host.setPointerCapture(e.pointerId); };
    const move = e => {
      if (!drag) return;
      ry += (e.clientX - px) * .01;
      rx = Math.max(-1.4, Math.min(1.4, rx + (e.clientY - py) * .01));
      px = e.clientX; py = e.clientY;
    };
    const up = () => { drag = false; };
    host.addEventListener("pointerdown", down);
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerup", up);
    host.addEventListener("pointercancel", up);

    const slab = (a, b, c, x, y, z, parent) => {
      const g = new THREE.BoxGeometry(a, b, c);
      const mat = new THREE.MeshStandardMaterial({ color: 0xc99a62, roughness: .9, side: THREE.DoubleSide });
      const lm = new THREE.LineBasicMaterial({ color: 0x6b4a26 });
      const m = new THREE.Mesh(g, mat);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), lm));
      m.position.set(x, y, z);
      (parent || grp).add(m);
      return m;
    };
    const drawBox = () => {
      if (grp) { grp.traverse(o => { if (o.geometry) o.geometry.dispose(); }); scene.remove(grp); }
      grp = new THREE.Group();
      const s = 3.2 / Math.max(L, W, H), l = L * s, w = W * s, h = H * s, t = .03;
      const tray = (l, w, h, y) => { slab(l, t, w, 0, y - h/2, 0); slab(l, h, t, 0, y, w/2); slab(l, h, t, 0, y, -w/2); slab(t, h, w, l/2, y, 0); slab(t, h, w, -l/2, y, 0); };
      const flap = (sg, len, dep, y, ang) => {
        const p = new THREE.Group(); p.position.set(0, y, sg * w/2); p.rotation.x = sg * ang; grp.add(p);
        slab(len, t, dep, 0, 0, -sg * dep/2, p);
      };
      if (type === "rsc" || type === "fol") {
        tray(l, w, h, 0); slab(l, t, w, 0, -h/2, 0);
        if (type === "rsc") { flap(1, l, w/2, h/2, 0); flap(-1, l, w/2, h/2, 0); }
        else { flap(1, l, w, h/2, 0); flap(-1, l, w, h/2 + t*2, 0); }
      } else if (type === "hsc") {
        tray(l, w, h, 0); flap(1, l, w/2, -h/2, 0); flap(-1, l, w/2, -h/2, 0);
        const a = 2.1;
        [1, -1].forEach(sg => { const p = new THREE.Group(); p.position.set(0, h/2, sg * w/2); p.rotation.x = sg * a; grp.add(p); slab(l, t, w/2, 0, 0, -sg * w/4, p); });
      } else if (type === "tel") {
        tray(l, w, h, -h * .35);
        const h2 = h * .4, e = t * 3;
        tray(l + e, w + e, h2, h * .55);
        grp.children[grp.children.length - 5].position.y = h * .55 + h2/2;
      } else {
        tray(l, w, h, 0);
        const p = new THREE.Group(); p.position.set(0, h/2, -w/2); p.rotation.x = -2.0; grp.add(p);
        slab(l, t, w, 0, 0, w/2, p);
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
        <DieChart type={type} L={L} W={W} H={H} J={35} />
        <small>Die cut · sheet — {unitLabel(unit)}</small>
      </div>
      <div className="stage" ref={hostRef}>
        <div className="dims">{dims(L, W, H, unit)}</div>
        <div className="tag">Drag to rotate</div>
      </div>
    </div>
  );
}
