/**
 * รับอัปโหลดรูปแล้วบันทึกลง public/uploads/<kind>/
 * POST /api/upload?kind=cave-maps|species&id=<id>  body = ไฟล์รูปดิบ  Content-Type: image/jpeg | image/png | image/webp
 * ตอบ { file } — ใช้ได้เฉพาะ `vite` (dev) และ `vite preview` (ไม่มีบน static hosting)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join, resolve } from 'node:path';
import type { Connect, Plugin } from 'vite';

const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const KINDS = ['cave-maps', 'species'];

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json');
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

const handler: Connect.NextHandleFunction = (req: IncomingMessage, res: ServerResponse, next) => {
  const url = new URL(req.url ?? '', 'http://local');
  if (url.pathname !== '/api/upload') return next();
  if (req.method !== 'POST') return send(res, 405, 'ใช้ POST เท่านั้น');

  const type = (req.headers['content-type'] ?? '').split(';')[0].trim();
  const ext = EXT[type];
  if (!ext) return send(res, 415, 'รองรับเฉพาะ JPG, PNG, WebP');

  const kind = url.searchParams.get('kind') ?? 'cave-maps';
  if (!KINDS.includes(kind)) return send(res, 400, 'kind ไม่ถูกต้อง');
  const dir = resolve('public/uploads', kind);
  const id = (url.searchParams.get('id') ?? url.searchParams.get('caveId') ?? 'img').replace(/[^A-Za-z0-9-]/g, '').slice(0, 32) || 'img';
  const chunks: Buffer[] = [];
  let size = 0;
  let aborted = false;
  req.on('data', (c: Buffer) => {
    if (aborted) return;
    size += c.length;
    if (size > MAX_BYTES) {
      aborted = true;
      send(res, 413, 'ไฟล์ใหญ่เกิน 5 MB');
      req.destroy();
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => {
    if (aborted) return;
    if (!size) return send(res, 400, 'ไม่มีข้อมูลไฟล์');
    try {
      mkdirSync(dir, { recursive: true });
      const file = `${id}-${Date.now()}.${ext}`;
      writeFileSync(join(dir, file), Buffer.concat(chunks));
      send(res, 200, { file });
    } catch (err) {
      send(res, 500, `บันทึกไฟล์ไม่สำเร็จ: ${(err as Error).message}`);
    }
  });
};

export function imageUploadPlugin(): Plugin {
  return {
    name: 'image-upload',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
