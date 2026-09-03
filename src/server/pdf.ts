/**
 * Wraps a single raster image as a one-page PDF. Receipts are rendered once
 * as an image (`server/receipt-image.ts`) so the download, the email
 * attachment, and the in-app ticket are pixel-identical instead of separate
 * hand-built designs drifting apart from each other.
 *
 * `pointWidth`/`pointHeight` size the page (72dpi); `jpeg`'s own pixel
 * dimensions can be larger (a higher-density render) for a sharper result
 * without inflating the page geometry.
 */
export function createImagePdf(params: {
  jpeg: Buffer;
  pixelWidth: number;
  pixelHeight: number;
  pointWidth: number;
  pointHeight: number;
}) {
  const { jpeg, pixelWidth, pixelHeight, pointWidth, pointHeight } = params;
  const enc = (value: string) => Buffer.from(value, "latin1");

  const content = `q ${pointWidth} 0 0 ${pointHeight} 0 0 cm /Im0 Do Q`;
  const objects: Buffer[] = [
    enc("<< /Type /Catalog /Pages 2 0 R >>"),
    enc("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    enc(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pointWidth} ${pointHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    ),
    Buffer.concat([
      enc(
        `<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      ),
      jpeg,
      enc("\nendstream"),
    ]),
    enc(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`),
  ];

  const parts: Buffer[] = [enc("%PDF-1.4\n")];
  let cursor = parts[0].length;
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(cursor);
    const header = enc(`${index + 1} 0 obj\n`);
    const footer = enc("\nendobj\n");
    parts.push(header, object, footer);
    cursor += header.length + object.length + footer.length;
  });

  const xrefOffset = cursor;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(enc(xref));

  return Buffer.concat(parts);
}
