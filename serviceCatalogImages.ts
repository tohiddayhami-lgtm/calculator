/** Client-side image compression for catalog builder uploads. */
export function compressCatalogImage(
  base64Str: string,
  maxWidth = 1024,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve) => {
    const preserveTransparency = /^data:image\/(png|webp|gif|svg\+xml)/i.test(base64Str);
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: true });
      if (ctx) {
        if (preserveTransparency) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        } else {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

export async function compressImageFiles(
  files: FileList | File[],
  maxWidth = 800,
  quality = 0.7
): Promise<string[]> {
  const out: string[] = [];
  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/')) continue;
    const raw = await readFileAsDataUrl(file);
    out.push(await compressCatalogImage(raw, maxWidth, quality));
  }
  return out;
}
