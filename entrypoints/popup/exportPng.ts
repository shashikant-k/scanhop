/** Turn the on-screen QR code (an SVG) into a PNG file the user can save. */

/** Width and height of the saved image. Large enough to print. */
const PNG_SIZE = 1024;

/** Draw an SVG element onto a canvas and return it as a PNG. */
export async function svgToPngBlob(svg: SVGSVGElement, size = PNG_SIZE): Promise<Blob> {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copy.setAttribute('width', String(size));
  copy.setAttribute('height', String(size));

  const svgUrl = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' }),
  );

  try {
    const image = new Image();
    image.src = svgUrl;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available');
    // QR squares must stay sharp, never blurred, when scaled up.
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, size, size);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not create the image'))),
        'image/png',
      );
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

/** A safe file name such as `scanhop-example.com.png`. */
export function pngFileName(url: string): string {
  let host = 'qr';
  try {
    host = new URL(url).hostname.replace(/^www\./, '') || host;
  } catch {
    // Keep the fallback name.
  }
  return `scanhop-${host.replace(/[^a-z0-9.-]/gi, '_')}.png`;
}

/** Ask the browser to save a blob under the given file name. */
export function saveBlob(blob: Blob, fileName: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the blob.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
