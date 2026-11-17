const MAX_SIDE = 1600;
const QUALITY = 0.82;

/** تصغير الصورة إلى 1600 بكسل JPEG 0.82. إعادة الرسم تحذف بيانات الموقع (GPS). */
export async function shrinkImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const g = canvas.getContext('2d');
  if (!g) throw new Error('canvas');
  g.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', QUALITY));
}
