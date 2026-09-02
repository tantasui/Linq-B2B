/**
 * Base-14 fonts have no encoding declared, so they fall back to
 * StandardEncoding — a single byte per glyph, and one that doesn't contain
 * ₦, ✓, or typographic spaces at all. Left alone, those come out as raw
 * UTF-8 bytes misread as separate Latin-1 glyphs (garbage like "âƒ"). Swap
 * the ones we actually produce and flatten anything else to plain ASCII
 * rather than let it corrupt the page.
 */
function sanitizePdfText(value: string) {
  return value
    .replace(/₦/g, "N") // Naira sign
    .replace(/[‘’]/g, String.fromCharCode(39))
    .replace(/[“”]/g, String.fromCharCode(34))
    .replace(/[–—]/g, "-")
    .replace(/✓/g, "") // checkmark, dropped: the status text already says it
    .replace(/[  -​  　]/g, " ") // unicode spaces
    .replace(/[^ -~]/g, "?");
}
function escapePdfText(value: string) {
  return sanitizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Courier is monospace and one of the 14 base fonts: every character is exactly 0.6em wide. */
const CHAR_WIDTH_EM = 0.6;
function textWidth(text: string, size: number) {
  return text.length * CHAR_WIDTH_EM * size;
}

/**
 * A believable barcode, not a scannable one: alternating black/white bars
 * whose widths are pseudo-random but deterministic from `seed`, so the same
 * order always draws the same pattern instead of a fresh one per render.
 */
export function barcodeBars(seed: string, count = 34) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  const bars: { width: number; black: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    bars.push({ width: 1 + (h % 3), black: i % 2 === 0 });
  }
  return bars;
}

type ReceiptRow = { label: string; value: string };

/**
 * A printable receipt/invoice, styled to match the in-app ticket's content
 * and the brand's paper-receipt reference: RECEIPT / No., a centred
 * wordmark, dashed rules, dotted-leader field rows, a bold total, a barcode,
 * and a footer — all in a fixed-width font so the dotted leaders and
 * right-aligned columns line up without needing real font metrics.
 */
export function createReceiptPdf(params: {
  title: string;
  receiptNumber: string;
  brand: string;
  tagline: string;
  dateLine: string;
  rows: ReceiptRow[];
  totalLabel: string;
  totalValue: string;
  footerLeft: string;
  footerRight: string;
}) {
  const width = 340;
  const height = 700;
  const margin = 28;
  const columnWidth = width - margin * 2;
  let y = height - 50;

  const content: string[] = ["0.961 0.941 0.902 rg", `0 0 ${width} ${height} re f`];

  const text = (value: string, size: number, x: number, yPos: number, bold: boolean, color: string) => {
    content.push(color);
    content.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${yPos} Td (${escapePdfText(value)}) Tj ET`);
  };
  const centered = (value: string, size: number, yPos: number, bold: boolean, color: string) => {
    text(value, size, (width - textWidth(value, size)) / 2, yPos, bold, color);
  };
  const dashedRule = (yPos: number) => {
    content.push("0.694 0.663 0.596 rg");
    for (let x = margin; x < width - margin; x += 8) {
      content.push(`${x} ${yPos} 4 1 re f`);
    }
  };

  const ink = "0.102 0.098 0.102 rg";
  const muted = "0.29 0.29 0.29 rg";
  const purple = "0.486 0.157 0.851 rg";

  // Header: e.g. "RECEIPT" (left) / No. (right)
  text(params.title.toUpperCase(), 12, margin, y, true, purple);
  const numberLabel = `No. ${params.receiptNumber}`;
  text(numberLabel, 12, width - margin - textWidth(numberLabel, 12), y, true, ink);
  y -= 34;

  // Brand + tagline
  centered(params.brand, 20, y, true, purple);
  y -= 18;
  centered(params.tagline, 8, y, false, muted);
  y -= 16;

  dashedRule(y);
  y -= 18;
  centered(params.dateLine, 9, y, false, ink);
  y -= 10;
  dashedRule(y);
  y -= 22;

  // Field rows with a dotted leader between label and value.
  for (const row of params.rows) {
    const size = 9;
    const charWidth = CHAR_WIDTH_EM * size;
    const totalChars = Math.floor(columnWidth / charWidth);
    const dotsNeeded = Math.max(2, totalChars - row.label.length - row.value.length - 1);
    const line = `${row.label} ${".".repeat(dotsNeeded)} ${row.value}`;
    text(line, size, margin, y, false, ink);
    y -= 16;
  }

  y -= 4;
  dashedRule(y);
  y -= 22;

  // Total, bold, both ends of the line.
  text(params.totalLabel, 12, margin, y, true, ink);
  text(params.totalValue, 12, width - margin - textWidth(params.totalValue, 12), y, true, ink);
  y -= 36;

  // Barcode.
  content.push("0.102 0.098 0.102 rg");
  const bars = barcodeBars(params.receiptNumber);
  const barcodeWidth = bars.reduce((sum, bar) => sum + bar.width, 0);
  let barX = (width - barcodeWidth) / 2;
  for (const bar of bars) {
    if (bar.black) content.push(`${barX.toFixed(1)} ${y - 30} ${bar.width} 30 re f`);
    barX += bar.width;
  }
  y -= 46;

  centered("Thank You!", 18, y, true, purple);
  y -= 30;

  dashedRule(y);
  y -= 18;
  text(params.footerLeft, 8, margin, y, false, muted);
  text(params.footerRight, 8, width - margin - textWidth(params.footerRight, 8), y, false, muted);

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>",
    `<< /Length ${Buffer.byteLength(content.join("\n"), "utf8")} >>\nstream\n${content.join("\n")}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}
