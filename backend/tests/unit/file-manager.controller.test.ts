import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import FileManagerController from '../../src/app/modules/file-manager/file-manager.controller';
import type FileManagerService from '../../src/app/modules/file-manager/file-manager.service';
import eventBus from '../../src/utils/event-bus';

// Мок eventBus
vi.mock('../../src/utils/event-bus', () => ({
  default: {
    emit: vi.fn(),
    on: vi.fn(),
  },
}));

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    socket: { remoteAddress: '192.168.1.100' },
    body: {},
    params: {},
    file: undefined,
    ...overrides,
  } as unknown as Request;
}

function createMockResponse(): Response & {
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
    _isJson?: boolean;
    _statusCode?: number;
    _body?: unknown;
  };
}

describe('FileManagerController', () => {
  let controller: FileManagerController;
  let mockService: {
    uploadFile: ReturnType<typeof vi.fn>;
    downloadFile: ReturnType<typeof vi.fn>;
    getFileStream: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
      getFileStream: vi.fn(),
    };
    controller = new FileManagerController(
      mockService as unknown as FileManagerService,
    );
  });

  // ─── uploadFile ───────────────────────────────────────────────
  describe('uploadFile', () => {
    it('should return 400 if callId is not provided', async () => {
      const req = createMockRequest({
        body: {},
        file: { originalname: 'a.txt', size: 100 } as Request['file'],
      });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      await controller.uploadFile(req, res, next);

      expect(next).toHaveBeenCalled();
      const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(err.status).toBe(400);
      expect(err.message).toBe('Не указан callId');
    });

    it('should return 400 if file is not provided', async () => {
      const req = createMockRequest({
        body: { callId: 'call-1' },
        file: undefined,
      });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      await controller.uploadFile(req, res, next);

      expect(next).toHaveBeenCalled();
      const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(err.status).toBe(400);
      expect(err.message).toBe('Файл не загружен');
    });

    it('should return 201 and emit event on success', async () => {
      const req = createMockRequest({
        body: { callId: 'call-1' },
        file: { originalname: 'photo.png', size: 2048 } as Request['file'],
      });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      mockService.uploadFile.mockResolvedValue({ fileId: 'file-abc' });

      await controller.uploadFile(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._statusCode).toBe(201);
      expect(res._body).toEqual({ fileId: 'file-abc' });
      expect(mockService.uploadFile).toHaveBeenCalledWith(
        req.file,
        '192.168.1.100',
        'call-1',
      );
      expect(eventBus.emit).toHaveBeenCalledWith('file:uploaded', {
        fileId: 'file-abc',
        originalName: 'photo.png',
        size: 2048,
        callId: 'call-1',
        senderIp: '192.168.1.100',
      });
    });

    it('should call next with error if service throws', async () => {
      const req = createMockRequest({
        body: { callId: 'call-1' },
        file: { originalname: 'doc.pdf', size: 500 } as Request['file'],
      });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      const serviceError = new Error('sender not found');
      (serviceError as any).status = 404;
      mockService.uploadFile.mockRejectedValue(serviceError);

      await controller.uploadFile(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
    });

    it('should use empty string when remoteAddress is undefined', async () => {
      const req = createMockRequest({
        socket: { remoteAddress: undefined } as unknown as Request['socket'],
        body: { callId: 'call-2' },
        file: { originalname: 'test.txt', size: 50 } as Request['file'],
      });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      mockService.uploadFile.mockResolvedValue({ fileId: 'file-xyz' });

      await controller.uploadFile(req, res, next);

      expect(mockService.uploadFile).toHaveBeenCalledWith(
        req.file,
        '',
        'call-2',
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
        },
      });

      const req = createMockRequest({ params: { fileId: 'view-1' } });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      await controller.viewFile(req, res, next);

      expect(mockService.getFileStream).toHaveBeenCalledWith('view-1');
      expect(res.headers['Content-Type']).toBe('image/png');
      expect(mockStream.pipe).toHaveBeenCalledWith(res);
      expect(next).not.toHaveBeenCalled();
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
        },
      });

      const req = createMockRequest({ params: { fileId: 'view-3' } });
      const res = createMockResponse();
      const next = vi.fn() as unknown as NextFunction;

      await controller.viewFile(req, res, next);

      // Проверяем, что on('error', ...) был зарегистрирован
      expect(mockStream.on).toHaveBeenCalledWith('error', expect.any(Function));

      // Вызываем error-handler и проверяем next
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
