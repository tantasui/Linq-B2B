"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LAND_MASK_BASE64 } from "./globe-mask";

/**
 * The hero's globe of ₦ coins: a port of the Framer "Dotted Globe" code
 * component, with the renderer, drag physics and flicker kept line for line.
 * Only the props the page sets are exposed; the defaults are the instance's.
 */

const ROWS = 90;
const COLS = 180;
const CELL = 2;

let maskCache: Uint8Array | null = null;
function mask() {
  if (maskCache) return maskCache;
  const raw = atob(LAND_MASK_BASE64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  maskCache = bytes;
  return bytes;
}

function isLand(lat: number, lon: number) {
  const bytes = mask();
  const row = Math.min(ROWS - 1, Math.max(0, Math.round((lat + 89) / CELL)));
  let col = Math.round((lon + 179) / CELL) % COLS;
  if (col < 0) col += COLS;
  const bit = row * COLS + col;
  return ((bytes[bit >> 3] >> (7 - (bit % 8))) & 1) === 1;
}

type Dot = { x0: number; y0: number; z0: number; isLand: boolean; jitter: number };

function buildDots(bands: number, perBand: number): Dot[] {
  const dots: Dot[] = [];
  for (let r = 0; r < bands; r++) {
    const lat = -90 + (r + 0.5) * (180 / bands);
    const count = Math.max(4, Math.round(perBand * Math.cos((lat * Math.PI) / 180)));
    for (let i = 0; i < count; i++) {
      const lon = -180 + (360 / count) * i;
      const la = (lat * Math.PI) / 180;
      const lo = (lon * Math.PI) / 180;
      dots.push({
        x0: Math.cos(la) * Math.sin(lo),
        y0: Math.sin(la),
        z0: Math.cos(la) * Math.cos(lo),
        isLand: isLand(lat, lon),
        jitter: Math.random(),
      });
    }
  }
  return dots;
}

type Props = {
  className?: string;
  /** Canvas edge in CSS px, per frame. */
  size: { desktop: number; phone: number };
  /** Latitude bands, per frame. */
  density: { desktop: number; phone: number };
};

const PHONE_QUERY = "(max-width: 1023.98px)";

export function DottedGlobe({ className, size, density }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phone, setPhone] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const px = phone ? size.phone : size.desktop;
  const bands = Math.round(phone ? density.phone : density.desktop);
  const dots = useMemo(() => (phone === null ? [] : buildDots(bands, bands * 2)), [bands, phone]);

  // Instance settings (hero, pTKRvmVAL).
  const dotColor = "rgb(230, 233, 251)";
  const symbolColor = "rgb(138, 79, 255)";
  const symbol = "₦";
  const dotSize = 2.45;
  const autoRotateSpeed = 0.07;
  const flickerSpeed = 0.25;
  const flickerIntensity = 0.35;

  const yaw = useRef((20 * Math.PI) / 180);
  const pitch = useRef((-8 * Math.PI) / 180);
  const yawVel = useRef(0);
  const pitchVel = useRef(0);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0, t: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || phone === null) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = px * dpr;
    canvas.height = px * dpr;
    canvas.style.width = `${px}px`;
    canvas.style.height = `${px}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cx = px / 2;
    const cy = px / 2;
    const radius = (px / 2) * 0.96;
    const cell = (radius / Math.max(bands, 1)) * 0.92;
    const hash = (n: number) => {
      const t = Math.sin(n * 12.9898) * 43758.5453;
      return t - Math.floor(t);
    };

    let raf = 0;
    let visible = true;
    let prev = performance.now();

    const draw = () => {
      const now = performance.now();
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      if (!dragging.current) {
        yawVel.current *= 0.94 ** (dt * 60);
        pitchVel.current *= 0.9 ** (dt * 60);
        yaw.current += ((reduce ? 0 : autoRotateSpeed) + yawVel.current) * dt;
        pitch.current += pitchVel.current * dt;
        pitch.current = Math.max(-1, Math.min(1, pitch.current));
      }
      const cy0 = Math.cos(yaw.current);
      const sy0 = Math.sin(yaw.current);
      const cp = Math.cos(pitch.current);
      const sp = Math.sin(pitch.current);
      ctx.clearRect(0, 0, px, px);

      const projected: { zf: number; sx: number; sy: number; isLand: boolean; jitter: number }[] = [];
      for (const d of dots) {
        const x = d.x0 * cy0 + d.z0 * sy0;
        const z = -d.x0 * sy0 + d.z0 * cy0;
        const y = d.y0;
        const y2 = y * cp - z * sp;
        const z2 = y * sp + z * cp;
        if (z2 < -0.05) continue;
        projected.push({ zf: z2, sx: cx + x * radius, sy: cy - y2 * radius, isLand: d.isLand, jitter: d.jitter });
      }
      projected.sort((a, b) => a.zf - b.zf);

      for (const p of projected) {
        const depth = Math.max(p.zf, 0);
        const shade = 0.35 + 0.75 * depth ** 0.5;
        const grow = 1 + (dotSize - 1) * depth ** 0.6;
        const alpha = Math.min(Math.max(p.zf / 0.15, 0), 1);
        if (alpha <= 0) continue;
        const filled =
          reduce || flickerIntensity <= 0
            ? true
            : hash(Math.floor(now * 0.001 * flickerSpeed * 3 + p.jitter * 10) + p.jitter * 37) > flickerIntensity;
        const x = Math.round(p.sx);
        const y = Math.round(p.sy);
        if (!p.isLand) continue; // showOceanDots is off on this instance
        const r = Math.round(cell * 0.62 * shade * grow);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.globalAlpha = alpha;
        if (filled) {
          ctx.fillStyle = dotColor;
          ctx.fill();
        } else {
          ctx.strokeStyle = dotColor;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        if (r > cell * 0.22) {
          ctx.fillStyle = filled ? symbolColor : dotColor;
          ctx.font = `${Math.max(Math.round(r * 1.05), 6)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(symbol, x, y + 0.5);
        }
        ctx.globalAlpha = 1;
      }
      if (visible) raf = requestAnimationFrame(draw);
    };

    const io = new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry.isIntersecting;
      if (visible && !was) {
        prev = performance.now();
        raf = requestAnimationFrame(draw);
      }
    });
    io.observe(canvas);
    raf = requestAnimationFrame(draw);
    return () => {
      visible = false;
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [dots, px, bands, phone]);

  // Drag to spin, with the component's own momentum constants.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const k = 0.006;
    const down = (e: PointerEvent) => {
      dragging.current = true;
      yawVel.current = 0;
      pitchVel.current = 0;
      last.current = { x: e.clientX, y: e.clientY, t: performance.now() };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      const now = performance.now();
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      const dt = Math.max(now - last.current.t, 1);
      yaw.current += dx * k;
      pitch.current = Math.max(-1, Math.min(1, pitch.current - dy * k));
      yawVel.current = ((dx * k) / (dt / 1000)) * 0.12;
      pitchVel.current = ((-dy * k) / (dt / 1000)) * 0.12;
      last.current = { x: e.clientX, y: e.clientY, t: now };
    };
    const up = (e: PointerEvent) => {
      dragging.current = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div ref={wrapRef} className={className} style={{ touchAction: "none", cursor: "grab" }} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
