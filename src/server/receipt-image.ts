import { readFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";

/**
 * Renders the same ticket shown in the app (`components/brand/Receipt.tsx`)
 * as a single raster image, server-side. The PDF download and the emailed
 * receipt both embed this image rather than maintaining their own separate
 * hand-drawn designs, so a payer or merchant sees one consistent ticket
 * everywhere instead of three drifting approximations of it.
 *
 * Text is rendered through `satori` with a bundled font (real glyph outlines
 * baked into its SVG output) rather than plain SVG `<text>` — a serverless
 * host has no guarantee of having *any* font installed, and `<text>` there
 * silently rasterizes to empty boxes instead of failing loudly. Everything
 * else (the ticket's shape: rounded top, scalloped bottom, perforation, the
 * Linq mark) is hand-drawn SVG, composited underneath the text as a raster
 * background — none of that needs a font at all.
 */

const COLOR = {
  pageBg: "#6d28d9",
  ticket: "#f5f0fc",
  ticketEdge: "#d2c5e7",
  accent: "#8e4dff",
  accentText: "#7737e6",
  ink: "#0b0b0e",
  muted: "#71717a",
  subtle: "#9a9aa2",
};

/** Vector-identical to `components/brand/LinqMark.tsx`'s source paths. */
const LINQ_MARK_VIEWBOX = { x: 191, y: 152.67, w: 131.59, h: 96.18 };
const LINQ_MARK_PATHS = [
  "M251.773 157.934L277.89 187.63L266.03 198.138L243.5 172.519C241.636 170.399 238.41 170.198 236.297 172.069L210.774 194.683C208.661 196.556 208.461 199.791 210.325 201.912L232.854 227.531C234.718 229.652 237.944 229.853 240.057 227.982L242.709 225.632L253.178 237.537L246.462 243.488C240.042 249.175 230.246 248.562 224.579 242.119L194.881 208.345C189.214 201.902 189.825 192.068 196.243 186.381L229.89 156.567C236.31 150.88 246.107 151.492 251.773 157.934Z",
  "M247.564 203.386L270.094 229.005C271.96 231.126 275.184 231.326 277.297 229.455L284.587 222.997L295.056 234.902L283.704 244.959C277.286 250.647 267.487 250.034 261.821 243.592L232.118 209.819C226.452 203.375 227.062 193.542 233.48 187.854L244.832 177.797L255.301 189.702L248.011 196.16C245.898 198.031 245.698 201.269 247.562 203.39L247.564 203.386Z",
  "M289.01 159.407L318.713 193.18C324.379 199.624 323.769 209.457 317.351 215.145L310.636 221.095L300.167 209.19L302.82 206.841C304.933 204.97 305.133 201.732 303.269 199.611L280.739 173.992C278.873 171.872 275.649 171.671 273.537 173.542L270.883 175.891L260.414 163.986L267.13 158.036C273.547 152.348 283.346 152.961 289.012 159.403L289.01 159.407Z",
  "M294.195 206.175L318.998 234.376C320.053 235.574 319.683 237.631 318.174 238.968L311.78 244.632C310.271 245.969 308.193 246.083 307.137 244.884L282.335 216.683C281.279 215.485 281.65 213.428 283.158 212.089L289.553 206.425C291.061 205.088 293.14 204.975 294.195 206.175Z",
];

/** Rough average glyph width per point size — good enough to keep a row from overrunning its column. */
function truncate(value: string, maxChars: number) {
  return value.length > maxChars ? `${value.slice(0, maxChars - 1)}…` : value;
}

function linqMark(cx: number, cy: number, size: number, color: string) {
  const scale = size / LINQ_MARK_VIEWBOX.w;
  const tx = cx - LINQ_MARK_VIEWBOX.x * scale;
  const ty = cy - LINQ_MARK_VIEWBOX.y * scale;
  const paths = LINQ_MARK_PATHS.map((d) => `<path d="${d}"/>`).join("");
  return `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)})" fill="${color}">${paths}</g>`;
}

function checkmark(cx: number, cy: number, color: string) {
  return `<path d="M ${cx - 4.5} ${cy} L ${cx - 1.5} ${cy + 3} L ${cx + 4.5} ${cy - 4.5}" stroke="${color}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** The rounded-top, scalloped-bottom card outline — the ticket's silhouette. */
function ticketPath(x: number, y: number, w: number, h: number, cornerRadius: number, scallopRadius: number) {
  const bumps = Math.round(w / (scallopRadius * 2));
  const bottomY = y + h;
  let d = `M ${x + cornerRadius} ${y} L ${x + w - cornerRadius} ${y} A ${cornerRadius} ${cornerRadius} 0 0 1 ${x + w} ${y + cornerRadius} L ${x + w} ${bottomY - scallopRadius}`;
  for (let i = 0; i < bumps; i++) {
    const startX = x + w - i * scallopRadius * 2;
    d += ` A ${scallopRadius} ${scallopRadius} 0 0 1 ${startX - scallopRadius * 2} ${bottomY - scallopRadius}`;
  }
  d += ` L ${x} ${y + cornerRadius} A ${cornerRadius} ${cornerRadius} 0 0 1 ${x + cornerRadius} ${y} Z`;
  return d;
}

export interface ReceiptImageRow {
  label: string;
  value: string;
}

export interface ReceiptImageView {
  statusLabel: string;
  settled: boolean;
  /** The big hero figure — the NGN amount, or the token amount for a wallet notice. */
  totalValue: string;
  /** The smaller line under the hero figure, e.g. "300.87 USDC" — omitted if not applicable. */
  subValue?: string;
  rows: ReceiptImageRow[];
}

interface TextNode {
  x: number;
  /** Baseline y, matching SVG `<text>` semantics — converted to a box top when laid out. */
  y: number;
  text: string;
  fontSize: number;
  weight: 400 | 700 | 800;
  color: string;
  anchor: "start" | "middle" | "end";
  letterSpacing?: number;
}

const WIDTH = 420;
const TICKET_WIDTH = 380;
const TICKET_X = (WIDTH - TICKET_WIDTH) / 2;
const CORNER_RADIUS = 18;
const SCALLOP_RADIUS = 10;
const OUTER_PAD = 28;
const ROW_HEIGHT = 34;

function svgHeight(rowCount: number) {
  const header = 40 + 78; // logo/status row + hero amount block
  const rows = rowCount * ROW_HEIGHT;
  const footer = 56;
  return OUTER_PAD * 2 + header + 40 /* perforation */ + rows + footer + SCALLOP_RADIUS;
}

/** The ticket's shape only — no text, so nothing here depends on a font being available. */
function buildTicketShapeSvg(view: ReceiptImageView) {
  const ticketHeight = svgHeight(view.rows.length) - OUTER_PAD * 2;
  const height = ticketHeight + OUTER_PAD * 2;
  const top = OUTER_PAD;

  let y = top + 34;
  const shapes: string[] = [];
  const text: TextNode[] = [];

  shapes.push(`<rect width="${WIDTH}" height="${height}" fill="${COLOR.pageBg}"/>`);
  shapes.push(
    `<path d="${ticketPath(TICKET_X, top, TICKET_WIDTH, ticketHeight, CORNER_RADIUS, SCALLOP_RADIUS)}" fill="${COLOR.ticket}"/>`,
  );

  const innerX = TICKET_X + 26;
  const innerRight = TICKET_X + TICKET_WIDTH - 26;

  // Header: mark left, status pill right.
  shapes.push(linqMark(innerX + 14, y - 5, 26, COLOR.accent));
  const statusText = truncate(view.statusLabel.toUpperCase(), 28);
  text.push({ x: innerRight, y, text: statusText, fontSize: 11, weight: 700, color: COLOR.accentText, anchor: "end", letterSpacing: 1 });
  if (view.settled) {
    // Measured empirically for this font/size rather than derived — good enough to sit just left of the label.
    const markWidth = statusText.length * 7.4 + 20;
    shapes.push(checkmark(innerRight - markWidth, y - 3.5, COLOR.accentText));
  }
  y += 56;

  // Hero amount.
  text.push({ x: WIDTH / 2, y, text: view.totalValue, fontSize: 34, weight: 700, color: COLOR.ink, anchor: "middle", letterSpacing: -0.5 });
  y += 26;
  if (view.subValue) {
    text.push({ x: WIDTH / 2, y, text: view.subValue, fontSize: 14, weight: 400, color: COLOR.muted, anchor: "middle" });
  }
  y += 32;

  // Perforation.
  shapes.push(
    `<line x1="${innerX}" y1="${y}" x2="${innerRight}" y2="${y}" stroke="${COLOR.ticketEdge}" stroke-width="2" stroke-dasharray="5 5"/>`,
  );
  shapes.push(`<circle cx="${TICKET_X}" cy="${y}" r="9" fill="${COLOR.pageBg}"/>`);
  shapes.push(`<circle cx="${TICKET_X + TICKET_WIDTH}" cy="${y}" r="9" fill="${COLOR.pageBg}"/>`);
  y += 32;

  // Detail rows.
  for (const row of view.rows) {
    text.push({ x: innerX, y, text: truncate(row.label, 20), fontSize: 12, weight: 400, color: COLOR.muted, anchor: "start" });
    text.push({ x: innerRight, y, text: truncate(row.value, 32), fontSize: 12, weight: 700, color: COLOR.ink, anchor: "end" });
    y += ROW_HEIGHT - 12;
    if (row !== view.rows[view.rows.length - 1]) {
      shapes.push(`<line x1="${innerX}" y1="${y}" x2="${innerRight}" y2="${y}" stroke="${COLOR.ticketEdge}" stroke-width="1" opacity="0.6"/>`);
    }
    y += 12;
  }

  y += 20;
  text.push({ x: WIDTH / 2, y, text: "linq.xyz  ·  support@linq.xyz", fontSize: 10, weight: 400, color: COLOR.subtle, anchor: "middle" });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">${shapes.join("")}</svg>`;
  return { svg, width: WIDTH, height, text };
}

let fontCache: { name: string; data: Buffer; weight: 400 | 700 | 800; style: "normal" }[] | null = null;

/** Loaded once per warm instance — these are small (~550KB each) static weights, not the much larger variable font. */
function loadFonts() {
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), "src/server/assets/fonts");
  fontCache = [
    { name: "Noto Sans", data: readFileSync(path.join(dir, "NotoSans-400.ttf")), weight: 400 as const, style: "normal" as const },
    { name: "Noto Sans", data: readFileSync(path.join(dir, "NotoSans-700.ttf")), weight: 700 as const, style: "normal" as const },
    { name: "Noto Sans", data: readFileSync(path.join(dir, "NotoSans-800.ttf")), weight: 800 as const, style: "normal" as const },
  ];
  return fontCache;
}

/** Rasterized at 2x for crisp text in both the PDF and the email image. */
export async function renderReceiptJpeg(view: ReceiptImageView) {
  const { svg: shapeSvg, width, height, text } = buildTicketShapeSvg(view);
  const shapePng = await sharp(Buffer.from(shapeSvg)).png().toBuffer();
  const backgroundUri = `data:image/png;base64,${shapePng.toString("base64")}`;

  const textNodes = text.map((node) => {
    // SVG's x/y is a baseline anchor point; satori boxes are positioned by
    // their top-left corner, so translate both the anchor and the vertical
    // baseline offset (~0.8× font size clears ascenders reasonably) into a
    // top/left/right box position.
    const top = node.y - node.fontSize * 0.85;
    const style: Record<string, string | number> = {
      position: "absolute",
      top,
      fontSize: node.fontSize,
      fontWeight: node.weight,
      color: node.color,
      whiteSpace: "pre",
      ...(node.letterSpacing ? { letterSpacing: node.letterSpacing } : {}),
    };
    if (node.anchor === "start") style.left = node.x;
    else if (node.anchor === "end") style.right = width - node.x;
    else {
      // satori lays out with flexbox only — `text-align` on its own has no
      // effect. A full-width flex row with `justifyContent: center` is what
      // actually centers the text within the canvas.
      style.left = 0;
      style.width = width;
      style.display = "flex";
      style.justifyContent = "center";
    }
    return { type: "div", props: { style, children: node.text } };
  });

  const tree = {
    type: "div",
    props: {
      style: { width, height, display: "flex", position: "relative" },
      children: [
        { type: "img", props: { src: backgroundUri, width, height, style: { position: "absolute", top: 0, left: 0 } } },
        ...textNodes,
      ],
    },
  };

  // satori accepts this plain VNode-style object at runtime without React
  // itself being involved; its types just assume a real ReactNode.
  const textSvg = await satori(tree as unknown as Parameters<typeof satori>[0], { width, height, fonts: loadFonts() });

  const scale = 2;
  const jpeg = await sharp(Buffer.from(textSvg))
    .resize(width * scale, height * scale)
    .jpeg({ quality: 92 })
    .toBuffer();
  return { jpeg, pointWidth: width, pointHeight: height };
}
