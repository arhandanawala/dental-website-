/**
 * Compress an uploaded image file client-side to a compact WebP/JPEG data URL
 * well below Firestore's 1MB document limit (target <= 220KB).
 */
export async function compressImageFileToDataUrl(
  file: File,
  maxWidth = 1000,
  maxBytes = 240_000
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file (PNG, JPG, or WebP).");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Image file is too large (maximum 10MB before compression).");
  }

  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Unable to decode image file."));
      el.src = bitmapUrl;
    });

    const scale = Math.min(1, maxWidth / Math.max(img.width || 1, 1));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas image compression is unavailable in this browser.");
    }
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.84;
    let dataUrl = canvas.toDataURL("image/webp", quality);
    if (!dataUrl.startsWith("data:image/webp")) {
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    while (dataUrl.length > maxBytes && quality > 0.35) {
      quality -= 0.12;
      const mime = dataUrl.startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
      dataUrl = canvas.toDataURL(mime, quality);
    }

    if (dataUrl.length > 320_000) {
      throw new Error("Compressed image is still too large. Please choose a smaller image or paste an image URL.");
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}
