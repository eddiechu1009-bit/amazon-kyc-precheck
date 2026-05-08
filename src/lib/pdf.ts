/**
 * In-browser PDF handling.
 *
 * - `extractPdfText` pulls the text layer straight from a PDF (fast, lossless).
 * - `rasterizePdfPages` rasterizes each page to a PNG blob for OCR fallback
 *   when a PDF has no text layer (scanned documents).
 *
 * All processing is local. No network requests involving user content.
 */

// Dynamically import pdf.js so it stays out of the initial bundle until needed.
async function getPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  // pdf.js needs a worker URL. We bundle it via Vite's ?url import.
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}

async function loadPdf(file: File | Blob) {
  const pdfjs = await getPdfJs();
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: buffer,
    isEvalSupported: false,
    disableAutoFetch: true,
    disableStream: true,
    useSystemFonts: true,
  });
  return loadingTask.promise;
}

export interface ExtractedPdf {
  pages: string[];
  fullText: string;
  /** True if the PDF appears to have no usable text layer. */
  probablyScanned: boolean;
}

export async function extractPdfText(file: File | Blob): Promise<ExtractedPdf> {
  const pdf = await loadPdf(file);
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it: any) => ('str' in it ? it.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pages.push(text);
  }
  const fullText = pages.join('\n\n');
  const lettersOnly = fullText.replace(/[^A-Za-z\u4e00-\u9fff]/g, '');
  const probablyScanned = lettersOnly.length < 30;
  return { pages, fullText, probablyScanned };
}

/**
 * Render each page of a scanned PDF to a PNG Blob so the caller can
 * pipe it into the OCR engine. Scale defaults to 2.0 for readable OCR input.
 */
export async function rasterizePdfPages(
  file: File | Blob,
  opts: {
    scale?: number;
    onProgress?: (p: { page: number; total: number }) => void;
    maxPages?: number;
  } = {},
): Promise<Blob[]> {
  const scale = opts.scale ?? 2.0;
  const pdf = await loadPdf(file);
  const total = Math.min(pdf.numPages, opts.maxPages ?? pdf.numPages);
  const blobs: Blob[] = [];
  for (let i = 1; i <= total; i++) {
    opts.onProgress?.({ page: i, total });
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    await page.render({
      canvas,
      canvasContext: ctx,
      viewport,
    } as any).promise;
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    if (blob) blobs.push(blob);
  }
  return blobs;
}
