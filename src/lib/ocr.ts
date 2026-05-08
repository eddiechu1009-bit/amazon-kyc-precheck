/**
 * In-browser OCR using tesseract.js.
 *
 * All processing happens in a web worker inside the seller's browser.
 * No file leaves the tab. Language data is fetched from CDN (tessdata)
 * on first use; this is the only outbound request and it's a public
 * static asset, not user content.
 */

export interface OcrProgress {
  status: string;
  progress: number; // 0..1
}

export interface OcrResult {
  text: string;
  confidence: number; // 0..100
}

const LANG = 'eng+chi_tra';

type Worker = Awaited<ReturnType<typeof createWorker>>;
let sharedWorker: Worker | null = null;

async function createWorker() {
  const tesseract = await import('tesseract.js');
  return tesseract.createWorker();
}

async function getWorker(onProgress?: (p: OcrProgress) => void): Promise<Worker> {
  if (sharedWorker) return sharedWorker;
  const tesseract = await import('tesseract.js');
  sharedWorker = await tesseract.createWorker(LANG, 1, {
    logger: (m: any) => {
      if (onProgress && typeof m?.progress === 'number') {
        onProgress({ status: m.status, progress: m.progress });
      }
    },
  });
  return sharedWorker;
}

export async function ocrImage(
  file: File | Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrResult> {
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(file as any);
  return { text: data.text ?? '', confidence: data.confidence ?? 0 };
}

export async function disposeOcr() {
  if (sharedWorker) {
    try {
      await sharedWorker.terminate();
    } catch {
      /* ignore */
    }
    sharedWorker = null;
  }
}
