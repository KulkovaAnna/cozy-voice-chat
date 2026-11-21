import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import FileManagerController from '../../src/app/modules/file-manager/file-manager.controller';
import type FileManagerService from '../../src/app/modules/file-manager/file-manager.service';

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    socket: { remoteAddress: '192.168.1.100' },
    body: {},
    params: {},
    file: undefined,
    files: undefined,
    ...overrides,
  } as unknown as Request;
}

function createMockResponse(): Response & {
  headers: Record<string, string>;
  _isJson?: boolean;
  _statusCode?: number;
  _body?: unknown;
} {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    _isJson: false,
    _statusCode: undefined as number | undefined,
    _body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      res._statusCode = code;
      return res;
    },
    json(body: unknown) {
      res._isJson = true;
      res._body = body;
      return res;
    },
    send(body?: unknown) {
      res._body = body;
      return res;
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value;
      return res;
    },
    on(event: string, _handler: (...args: unknown[]) => void) {
      return res;
    },
    off(event: string, _handler: (...args: unknown[]) => void) {
      return res;
    },
    pipe(_dest: unknown) {
      return res;
    },
  };
  return res as unknown as Response & {
    headers: Record<string, string>;
    _isJson?: boolean;
    _statusCode?: number;
    _body?: unknown;
  };
}

const uploadedFiles = [
  { originalname: 'photo.png', size: 2048 },
  { originalname: 'doc.pdf', size: 512 },
] as Express.Multer.File[];

describe('FileManagerController', () => {
  let controller: FileManagerController;
  let mockService: {
    uploadAttachments: ReturnType<typeof vi.fn>;
    downloadFile: ReturnType<typeof vi.fn>;
    getFileStream: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      uploadAttachments: vi.fn(),
      downloadFile: vi.fn(),
      getFileStream: vi.fn(),
    };
    controller = new FileManagerController(
      mockService as unknown as FileManagerService,
    );
  });

  // ─── uploadAttachments ────────────────────────────────────────
  describe('uploadAttachments', () => {
    it('should return 400 if callId is not provided', async () => {
      const req = createMockRequest({
        body: { clientId: 'client-1' },
        files: uploadedFiles,
      });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      await controller.uploadAttachments(req, res, next);

      const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(err.status).toBe(400);
      expect(err.message).toBe('Не указан callId');
    });

    it('should return 400 if clientId is not provided', async () => {
      const req = createMockRequest({
        body: { callId: 'call-1' },
        files: uploadedFiles,
      });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      await controller.uploadAttachments(req, res, next);

      const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(err.status).toBe(400);
      expect(err.message).toBe('Не указан clientId');
    });

    it('should return 400 if files are not provided', async () => {
      const req = createMockRequest({
        body: { callId: 'call-1', clientId: 'client-1' },
        files: undefined,
      });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      await controller.uploadAttachments(req, res, next);

      const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(err.status).toBe(400);
      expect(err.message).toBe('Файлы не загружены');
    });
    it('should return 201 with uploaded attachments on success', async () => {
      const req = createMockRequest({
        body: { callId: 'call-1', clientId: 'client-1' },
        files: uploadedFiles,
      });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      mockService.uploadAttachments.mockResolvedValue([
        { id: 'file-1', fileName: 'photo.png', fileSize: 2048 },
        { id: 'file-2', fileName: 'doc.pdf', fileSize: 512 },
      ]);

      await controller.uploadAttachments(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._statusCode).toBe(201);
      expect(res._body).toEqual({
        files: [
          { id: 'file-1', fileName: 'photo.png', fileSize: 2048 },
          { id: 'file-2', fileName: 'doc.pdf', fileSize: 512 },
        ],
      });
      expect(mockService.uploadAttachments).toHaveBeenCalledWith(
        uploadedFiles,
        '192.168.1.100',
        'call-1',
        'client-1',
      );
    });

    it('should call next with error if service throws', async () => {
      const req = createMockRequest({
        body: { callId: 'call-1', clientId: 'client-1' },
        files: uploadedFiles,
      });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      const serviceError = new Error('Отправитель не найден');
      (serviceError as any).status = 404;
      mockService.uploadAttachments.mockRejectedValue(serviceError);

      await controller.uploadAttachments(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
    });

    it('should use empty string when remoteAddress is undefined', async () => {
      const req = createMockRequest({
        socket: { remoteAddress: undefined } as unknown as Request['socket'],
        body: { callId: 'call-2', clientId: 'client-2' },
        files: uploadedFiles,
      });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      mockService.uploadAttachments.mockResolvedValue([]);

      await controller.uploadAttachments(req, res, next);

      expect(mockService.uploadAttachments).toHaveBeenCalledWith(
        uploadedFiles,
        '',
        'call-2',
        'client-2',
      );
    });
  });

  // ─── downloadFile ─────────────────────────────────────────────
  describe('downloadFile', () => {
    it('should set Content-Disposition and pipe stream on success', async () => {
      const mockStream = { pipe: vi.fn() };
      mockService.downloadFile.mockResolvedValue({
        stream: mockStream,
        filename: 'report.pdf',
      });

      const req = createMockRequest({ params: { fileId: 'file-123' } });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      await controller.downloadFile(req, res, next);

      expect(mockService.downloadFile).toHaveBeenCalledWith('file-123');
      expect(res.headers['Content-Disposition']).toContain('attachment');
      expect(res.headers['Content-Disposition']).toContain(
        encodeURIComponent('report.pdf'),
      );
      expect(mockStream.pipe).toHaveBeenCalledWith(res);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error if service throws', async () => {
      const serviceError = new Error('Файл не найден');
      (serviceError as any).status = 404;
      mockService.downloadFile.mockRejectedValue(serviceError);

      const req = createMockRequest({ params: { fileId: 'missing-id' } });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      await controller.downloadFile(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
    });
  });

  // ─── viewFile ─────────────────────────────────────────────────
  describe('viewFile', () => {
    it('should set Content-Type from filename extension and pipe stream', async () => {
      const mockStream = { pipe: vi.fn(), on: vi.fn() };
      mockService.getFileStream.mockResolvedValue({
        stream: mockStream,
        meta: {
          originalName: 'image.png',
          path: '/tmp/image.png',
          senderId: 'u1',
          callId: 'c1',
          createdAt: Date.now(),
          size: 100,
        },
      });

      const req = createMockRequest({ params: { fileId: 'view-1' } });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      await controller.viewFile(req, res, next);

      expect(mockService.getFileStream).toHaveBeenCalledWith('view-1', undefined);
      expect(res.headers['Content-Type']).toBe('image/png');
      expect(res.headers['Accept-Ranges']).toBe('bytes');
      expect(mockStream.pipe).toHaveBeenCalledWith(res);
      expect(next).not.toHaveBeenCalled();
    });

    it('should respond 206 and set Content-Range for range requests', async () => {
      const mockStream = { pipe: vi.fn(), on: vi.fn() };
      mockService.getFileStream.mockResolvedValue({
        stream: mockStream,
        meta: {
          originalName: 'clip.mp4',
          path: '/tmp/clip.mp4',
          senderId: 'u1',
          callId: 'c1',
          createdAt: Date.now(),
          size: 5000,
        },
        range: { start: 100, end: 199 },
      });

      const req = createMockRequest({
        params: { fileId: 'view-range' },
        headers: { range: 'bytes=100-199' },
      });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      await controller.viewFile(req, res, next);

      expect(mockService.getFileStream).toHaveBeenCalledWith(
        'view-range',
        'bytes=100-199',
      );
      expect(res._statusCode).toBe(206);
      expect(res.headers['Content-Type']).toBe('video/mp4');
      expect(res.headers['Accept-Ranges']).toBe('bytes');
      expect(res.headers['Content-Range']).toBe('bytes 100-199/5000');
      expect(res.headers['Content-Length']).toBe('100');
      expect(mockStream.pipe).toHaveBeenCalledWith(res);
    });

    it('should fallback to application/octet-stream for unknown extension', async () => {
      const mockStream = { pipe: vi.fn(), on: vi.fn() };
      mockService.getFileStream.mockResolvedValue({
        stream: mockStream,
        meta: {
          originalName: 'data.unknownext',
          path: '/tmp/data',
          senderId: 'u1',
          callId: 'c1',
          createdAt: Date.now(),
          size: 100,
        },
      });

      const req = createMockRequest({ params: { fileId: 'view-2' } });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      await controller.viewFile(req, res, next);

      expect(res.headers['Content-Type']).toBe('application/octet-stream');
    });

    it('should register stream error handler that calls next', async () => {
      const mockStream = { pipe: vi.fn(), on: vi.fn() };
      mockService.getFileStream.mockResolvedValue({
        stream: mockStream,
        meta: {
          originalName: 'file.txt',
          path: '/tmp/file.txt',
          senderId: 'u1',
          callId: 'c1',
          createdAt: Date.now(),
          size: 100,
        },
      });

      const req = createMockRequest({ params: { fileId: 'view-3' } });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      await controller.viewFile(req, res, next);

      expect(mockStream.on).toHaveBeenCalledWith('error', expect.any(Function));

      const errorHandler = mockStream.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'error',
      )?.[1] as (...args: unknown[]) => void;
      const streamError = new Error('stream broken');
      errorHandler(streamError);
      expect(next).toHaveBeenCalledWith(streamError);
    });

    it('should call next with error if service throws', async () => {
      const serviceError = new Error('Файл не найден или удалён');
      (serviceError as any).status = 404;
      mockService.getFileStream.mockRejectedValue(serviceError);

      const req = createMockRequest({ params: { fileId: 'missing' } });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      await controller.viewFile(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
    });
  });
});
