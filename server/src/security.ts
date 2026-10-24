import { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';

// Allowed origins for local web client
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);

export function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Ensure request is arriving from localhost
  const remoteAddress = req.socket.remoteAddress || '';
  const isLocalhost =
    remoteAddress === '127.0.0.1' ||
    remoteAddress === '::1' ||
    remoteAddress === '::ffff:127.0.0.1';

  if (!isLocalhost) {
    res.status(403).json({ error: 'Truy cập bị từ chối: Chỉ cho phép kết nối từ localhost.' });
    return;
  }

  // 2. For mutating requests, verify Origin header
  const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (mutatingMethods.includes(req.method)) {
    const origin = req.headers.origin;
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      res.status(403).json({ error: `Origin '${origin}' không được cấp phép.` });
      return;
    }
  }

  next();
}

export function validateFolderPath(folderPath: string): { valid: boolean; error?: string } {
  if (!folderPath || typeof folderPath !== 'string') {
    return { valid: false, error: 'Đường dẫn thư mục không hợp lệ.' };
  }

  try {
    const resolved = path.resolve(folderPath);
    if (!fs.existsSync(resolved)) {
      return { valid: false, error: `Thư mục không tồn tại: ${resolved}` };
    }
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return { valid: false, error: `Đường dẫn phải là thư mục, không phải tệp tin: ${resolved}` };
    }
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: `Lỗi kiểm tra đường dẫn: ${err.message}` };
  }
}
