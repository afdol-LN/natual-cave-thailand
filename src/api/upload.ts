/** อัปโหลดรูป (แผนที่ถ้ำ / ชนิดพันธุ์) ผ่าน Vite dev server (plugin ใน vite-upload-plugin.ts) */

export type UploadKind = 'cave-maps' | 'species';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const imageUrl = (kind: UploadKind, file: string) => `/uploads/${kind}/${encodeURIComponent(file)}`;
export const mapImageUrl = (file: string) => imageUrl('cave-maps', file);

/** คืนชื่อไฟล์ที่บันทึก */
export async function uploadImage(kind: UploadKind, id: string, file: File): Promise<string> {
  if (!UPLOAD_TYPES.includes(file.type)) throw new Error('รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('ไฟล์ใหญ่เกิน 5 MB');
  let res: Response;
  try {
    res = await fetch(`/api/upload?kind=${kind}&id=${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
  } catch {
    throw new Error('อัปโหลดไม่สำเร็จ: ติดต่อเซิร์ฟเวอร์ไม่ได้');
  }
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(
      res.status === 404 ? 'อัปโหลดได้เฉพาะตอนรัน npm run dev หรือ npm run preview' : `อัปโหลดไม่สำเร็จ (${res.status}) ${msg}`.trim(),
    );
  }
  const { file: saved } = (await res.json()) as { file: string };
  return saved;
}

export const uploadCaveMap = (caveId: string, file: File) => uploadImage('cave-maps', caveId, file);
