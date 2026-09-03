import { PDFDocument } from "pdf-lib";

/**
 * Wraps a single raster image as a one-page PDF, via `pdf-lib` rather than a
 * hand-written byte layout: a previous version built the PDF's xref table
 * and stream dictionaries by hand and produced files that some real-world
 * viewers (outside whatever tolerant tool this was last eyeballed with)
 * refused to render properly. `pdf-lib` is a well-exercised, dependency-free
 * PDF writer — same content, a correct file.
 *
 * `pointWidth`/`pointHeight` size the page (72dpi); the JPEG's own pixel
 * dimensions can be larger (a higher-density render) for a sharper result
 * without inflating the page geometry.
 */
export async function createImagePdf(params: {
  jpeg: Buffer;
  pointWidth: number;
  pointHeight: number;
}) {
  const { jpeg, pointWidth, pointHeight } = params;
  const doc = await PDFDocument.create();
  const image = await doc.embedJpg(jpeg);
  const page = doc.addPage([pointWidth, pointHeight]);
  page.drawImage(image, { x: 0, y: 0, width: pointWidth, height: pointHeight });
  const bytes = await doc.save();
  return Buffer.from(bytes);
}
