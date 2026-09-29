import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import FileManagerService from '../../src/app/modules/file-manager/file-manager.service';
import type { CallManagerLike, LobbyManagerLike } from '../../src/app/modules/file-manager/file-manager.types';

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
  },
  createReadStream: vi.fn(() => ({ pipe: vi.fn(), on: vi.fn() })),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mocked-uuid-1234'),
}));

describe('FileManagerService', () => {
  let service: FileManagerService;
  let mockCallManager: { getCallById: ReturnType<typeof vi.fn> };
  let mockLobbyManager: { getMemberByIp: ReturnType<typeof vi.fn> };

  const fakeClient = { id: 'client-1', name: 'Anna' };
  const fakeCall = { id: 'call-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallManager = { getCallById: vi.fn() };
    mockLobbyManager = { getMemberByIp: vi.fn() };
    service = new FileManagerService(
      mockCallManager as unknown as CallManagerLike,
      mockLobbyManager as unknown as LobbyManagerLike,
    );
  });

  // ─── uploadFile ───────────────────────────────────────────────
  describe('uploadFile', () => {
    const mulFile = {
      fieldname: 'file',
      originalname: 'report.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      filename: 'abc123',
      destination: '/tmp/uploads',
      path: '/tmp/uploads/abc123',
      buffer: Buffer.from(''),
    } as const;

    it('should throw 404 if sender not found by IP', async () => {
      mockLobbyManager.getMemberByIp.mockReturnValue(undefined);
      mockCallManager.getCallById.mockReturnValue(fakeCall);

      await expect(
        service.uploadFile(mulFile as any, '10.0.0.1', 'call-1'),
      ).rejects.toMatchObject({ status: 404, message: 'Отправитель не найден' });
    });

    it('should throw 404 if call not found', async () => {
      mockLobbyManager.getMemberByIp.mockReturnValue(fakeClient);
      mockCallManager.getCallById.mockReturnValue(undefined);

      await expect(
        service.uploadFile(mulFile as any, '10.0.0.1', 'unknown-call'),
      ).rejects.toMatchObject({ status: 404, message: 'Звонок не найден' });
    });

    it('should rename file and return fileId on success', async () => {
      mockLobbyManager.getMemberByIp.mockReturnValue(fakeClient);
      mockCallManager.getCallById.mockReturnValue(fakeCall);

      const result = await service.uploadFile(mulFile as any, '10.0.0.1', 'call-1');

      expect(result).toEqual({ fileId: 'mocked-uuid-1234' });
      expect(fs.promises.rename).toHaveBeenCalled();
      // Проверяем что целевой путь содержит расширение
      const targetPath = (fs.promises.rename as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(targetPath).toContain('mocked-uuid-1234.pdf');
    });

    it('should store metadata accessible via downloadFile', async () => {
      mockLobbyManager.getMemberByIp.mockReturnValue(fakeClient);
      mockCallManager.getCallById.mockReturnValue(fakeCall);

      await service.uploadFile(mulFile as any, '10.0.0.1', 'call-1');

      // downloadFile не должен бросить 404 для загруженного файла
      mockCallManager.getCallById.mockReturnValue(fakeCall);
      const dlResult = await service.downloadFile('mocked-uuid-1234');
      expect(dlResult.filename).toBe('report.pdf');
    });
  });

  // ─── downloadFile ─────────────────────────────────────────────
  describe('downloadFile', () => {
    it('should throw 404 for unknown fileId', async () => {
      await expect(
        service.downloadFile('nonexistent-id'),
      ).rejects.toMatchObject({ status: 404, message: 'Файл не найден или уже удалён' });
    });

    it('should return stream, filename, path and cleanup', async () => {
      // Сначала загрузим файл
      mockLobbyManager.getMemberByIp.mockReturnValue(fakeClient);
      mockCallManager.getCallById.mockReturnValue(fakeCall);
      const mulFile = {
        originalname: 'doc.txt',
        path: '/tmp/abc',
        size: 100,
      } as any;
      await service.uploadFile(mulFile, '10.0.0.1', 'call-1');

      const result = await service.downloadFile('mocked-uuid-1234');

      expect(result.filename).toBe('doc.txt');
      expect(result.stream).toBeDefined();
      expect(result.path).toContain('mocked-uuid-1234');
      expect(typeof result.cleanup).toBe('function');
    });

    it('should remove metadata after cleanup is called', async () => {
      mockLobbyManager.getMemberByIp.mockReturnValue(fakeClient);
      mockCallManager.getCallById.mockReturnValue(fakeCall);
      const mulFile = {
        originalname: 'img.png',
        path: '/tmp/img',
        size: 200,
      } as any;
      await service.uploadFile(mulFile, '10.0.0.1', 'call-1');

      const { cleanup } = await service.downloadFile('mocked-uuid-1234');
      cleanup();

      // После cleanup файл больше не доступен
      await expect(
        service.downloadFile('mocked-uuid-1234'),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ─── getFileStream ────────────────────────────────────────────
  describe('getFileStream', () => {
    it('should throw 404 for unknown fileId', async () => {
      await expect(
        service.getFileStream('no-such-id'),
      ).rejects.toMatchObject({ status: 404, message: 'Файл не найден или удалён' });
    });

    it('should return stream and meta for existing file', async () => {
      mockLobbyManager.getMemberByIp.mockReturnValue(fakeClient);
      mockCallManager.getCallById.mockReturnValue(fakeCall);
      const mulFile = {
        originalname: 'video.mp4',
        path: '/tmp/vid',
        size: 5000,
      } as any;
      await service.uploadFile(mulFile, '10.0.0.1', 'call-1');

      const result = await service.getFileStream('mocked-uuid-1234');

      expect(result.meta.originalName).toBe('video.mp4');
      expect(result.meta.senderId).toBe('client-1');
      expect(result.meta.callId).toBe('call-1');
      expect(result.stream).toBeDefined();
    });
  });

  // ─── cleanDownloads ───────────────────────────────────────────
  describe('cleanDownloads', () => {
    it('should unlink all files and clear metadata', async () => {
      // Загрузим файл
      mockLobbyManager.getMemberByIp.mockReturnValue(fakeClient);
      mockCallManager.getCallById.mockReturnValue(fakeCall);
      const mulFile = {
        originalname: 'temp.dat',
        path: '/tmp/temp',
        size: 10,
      } as any;
      await service.uploadFile(mulFile, '10.0.0.1', 'call-1');

      // Мокнем readdir — возвращаем директорию с одним файлом
      const fakeDirent = { isFile: () => true, name: 'mocked-uuid-1234.dat' };
      (fs.promises.readdir as ReturnType<typeof vi.fn>).mockResolvedValue([fakeDirent]);

      await service.cleanDownloads();

      expect(fs.promises.unlink).toHaveBeenCalled();

      // После очистки metadata пуста — getFileStream бросит 404
      await expect(
        service.getFileStream('mocked-uuid-1234'),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('should handle readdir error gracefully', async () => {
      (fs.promises.readdir as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('ENOENT'),
      );

      // Не должна выбросить ошибку
      await expect(service.cleanDownloads()).resolves.toBeUndefined();
    });
  });
});
