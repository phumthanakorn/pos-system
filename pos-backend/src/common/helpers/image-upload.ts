import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const UPLOAD_ROOT = join(process.cwd(), 'uploads');
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

type ImageKind = { ext: 'jpg' | 'png' | 'webp' };

function detectImage(buffer: Buffer): ImageKind | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg' };
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: 'png' };
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { ext: 'webp' };
  }
  return null;
}

export async function saveImage(file: Express.Multer.File | undefined, folder: string): Promise<string> {
  if (!file) {
    throw new BadRequestException('ไม่พบไฟล์รูปภาพ');
  }
  const kind = detectImage(file.buffer);
  if (!kind) {
    throw new BadRequestException('รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP');
  }
  const dir = join(UPLOAD_ROOT, folder);
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${kind.ext}`;
  await writeFile(join(dir, filename), file.buffer);
  return `/uploads/${folder}/${filename}`;
}

export async function deleteImage(url: string | null | undefined): Promise<void> {
  if (!url?.startsWith('/uploads/')) return;
  const relative = url.slice('/uploads/'.length);
  if (relative.includes('..')) return;
  await unlink(join(UPLOAD_ROOT, relative)).catch(() => undefined);
}
