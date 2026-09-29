import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import FileManagerController from '../../src/app/modules/file-manager/file-manager.controller';
import FileManagerRoutes from '../../src/app/modules/file-manager/file-manager.routes';
import type FileManagerService from '../../src/app/modules/file-manager/file-manager.service';
import eventBus from '../../src/utils/event-bus';

vi.mock('../../src/utils/event-bus', () => ({
  default: {
    emit: vi.fn(),
    on: vi.fn(),
  },
}));

function createApp(serviceMock: {
  uploadFile: ReturnType<typeof vi.fn>;
  downloadFile: ReturnType<typeof vi.fn>;
  getFileStream: ReturnType<typeof vi.fn>;
}) {
  const controller = new FileManagerController(
    serviceMock as unknown as FileManagerService,
  );
  const routes = new FileManagerRoutes(controller);
  const app = express();
  app.use(express.json());
  app.use(FileManagerRoutes.BASE_URL, routes.getRouter());
  // Error handler для проверки next(err)
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(err.status || 500).json({ error: err.message });
    },
  );
  return app;
}

describe('FileManagerRoutes (integration)', () => {
  let mockService: {
    uploadFile: ReturnType<typeof vi.fn>;
    downloadFile: ReturnType<typeof vi.fn>;
    getFileStream: ReturnType<typeof vi.fn>;
  };
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
      getFileStream: vi.fn(),
    };
    app = createApp(mockService);
  });

  // ─── POST /files/upload ───────────────────────────────────────
  describe('POST /files/upload', () => {
    it('should upload a file and return 201', async () => {
      mockService.uploadFile.mockResolvedValue({ fileId: 'uuid-abc' });

      const res = await request(app)
        .post('/files/upload')
        .field('callId', 'call-42')
        .attach('file', Buffer.from('hello world'), 'test.txt');

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ fileId: 'uuid-abc' });
      expect(mockService.uploadFile).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        'file:uploaded',
        expect.objectContaining({
          fileId: 'uuid-abc',
          originalName: 'test.txt',
          callId: 'call-42',
        }),
      );
    });

    it('should return 400 if callId is missing', async () => {
      const res = await request(app)
        .post('/files/upload')
        .attach('file', Buffer.from('data'), 'x.txt');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Не указан callId');
    });

    it('should return 400 if no file attached', async () => {
      const res = await request(app)
        .post('/files/upload')
        .field('callId', 'call-1');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Файл не загружен');
    });

    it('should propagate service error (404)', async () => {
      const err: any = new Error('Отправитель не найден');
      err.status = 404;
      mockService.uploadFile.mockRejectedValue(err);

      const res = await request(app)
        .post('/files/upload')
        .field('callId', 'call-x')
        .attach('file', Buffer.from('content'), 'y.txt');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Отправитель не найден');
    });
  });

  // ─── GET /files/download/:fileId ──────────────────────────────
  describe('GET /files/download/:fileId', () => {
    it('should stream file with Content-Disposition header', async () => {
      // Создаём Readable-поток вместо ReadStream
      const { Readable } = require('stream');
      const fakeStream = new Readable({
        read() {
          this.push(Buffer.from('file content here'));
          this.push(null);
        },
      });

      mockService.downloadFile.mockResolvedValue({
        stream: fakeStream,
        filename: 'my document.pdf',
      });

      const res = await request(app).get('/files/download/file-99');

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain(
        encodeURIComponent('my document.pdf'),
      );
      expect(res.text).toBe('file content here');
    });

    it('should return 404 for unknown fileId', async () => {
      const err: any = new Error('Файл не найден или уже удалён');
      err.status = 404;
      mockService.downloadFile.mockRejectedValue(err);

      const res = await request(app).get('/files/download/nope');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Файл не найден или уже удалён');
    });
  });

  // ─── GET /files/view/:fileId ──────────────────────────────────
  describe('GET /files/view/:fileId', () => {
    it('should return file with correct Content-Type', async () => {
      const { Readable } = require('stream');
      const fakeStream = new Readable({
        read() {
          this.push(Buffer.from('fake png data'));
          this.push(null);
        },
      });

      mockService.getFileStream.mockResolvedValue({
        stream: fakeStream,
        meta: {
          originalName: 'sunset.png',
          path: '/tmp/sunset.png',
          senderId: 'u1',
          callId: 'c1',
          createdAt: Date.now(),
        },
      });

      const res = await request(app)
        .get('/files/view/file-100')
        .buffer(true)
        .parse((res, cb) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
      expect((res.body as Buffer).toString()).toBe('fake png data');
    });

    it('should fallback to application/octet-stream', async () => {
      const { Readable } = require('stream');
      const fakeStream = new Readable({
        read() {
          this.push(Buffer.from('binary'));
          this.push(null);
        },
      });

      mockService.getFileStream.mockResolvedValue({
        stream: fakeStream,
        meta: {
          originalName: 'data.xyz123',
          path: '/tmp/data.xyz123',
          senderId: 'u1',
          callId: 'c1',
          createdAt: Date.now(),
        },
      });

      const res = await request(app).get('/files/view/file-200');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/octet-stream');
    });

    it('should return 404 if file not found', async () => {
      const err: any = new Error('Файл не найден или удалён');
      err.status = 404;
      mockService.getFileStream.mockRejectedValue(err);

      const res = await request(app).get('/files/view/missing');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Файл не найден или удалён');
    });
  });
});
