import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import FileManagerService from '../../src/app/modules/file-manager/file-manager.service';
import type {
  CallManagerLike,
  LobbyManagerLike,
} from '../../src/app/modules/file-manager/file-manager.types';

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    readFile: vi.fn().mockResolvedValue('{}'),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
  readFileSync: vi.fn(() => '{}'),
  writeFileSync: vi.fn(),
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
      ).rejects.toMatchObject({
        status: 404,
        message: 'Отправитель не найден',
      });
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

      const result = await service.uploadFile(
        mulFile as any,
        '10.0.0.1',
        'call-1',
      );

      expect(result).toEqual({ fileId: 'mocked-uuid-1234' });
      expect(fs.promises.rename).toHaveBeenCalled();
      // Проверяем что целевой путь содержит расширение
      const targetPath = (fs.promises.rename as ReturnType<typeof vi.fn>).mock
        .calls[0][1];
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
      ).rejects.toMatchObject({
        status: 404,
        message: 'Файл не найден или уже удалён',
      });
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
      await expect(service.getFileStream('no-such-id')).rejects.toMatchObject({
        status: 404,
        message: 'Файл не найден или удалён',
      });
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
      (fs.promises.readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
        fakeDirent,
      ]);

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

  // ─── uploadProfileFile / getProfileFile / deleteProfileFile ───
  describe('profile files', () => {
    const mulFile = {
      originalname: 'avatar.png',
      path: '/tmp/avatar',
      size: 1024,
    } as any;

    it('should throw 404 if owner not found by IP', async () => {
      mockLobbyManager.getMemberByIp.mockReturnValue(undefined);

      await expect(
        service.uploadProfileFile(mulFile, '10.0.0.9'),
      ).rejects.toMatchObject({
        status: 404,
        message: 'Отправитель не найден',
      });
    });

    it('should rename file and return fileId on success', async () => {
      mockLobbyManager.getMemberByIp.mockReturnValue(fakeClient);

      const result = await service.uploadProfileFile(mulFile, '10.0.0.1');

      expect(result).toEqual({ fileId: 'mocked-uuid-1234' });
      expect(fs.promises.rename).toHaveBeenCalled();
      // Файлы профиля сохраняются в папку profile/
      const targetPath = (fs.promises.rename as ReturnType<typeof vi.fn>).mock
        .calls[0][1];
      expect(targetPath).toContain('mocked-uuid-1234.png');
      expect(targetPath).toContain('profile');
    });

    it('should return stream and meta for existing profile file', async () => {
      mockLobbyManager.getMemberByIp.mockReturnValue(fakeClient);
      await service.uploadProfileFile(mulFile, '10.0.0.1');

      const result = await service.getProfileFile('mocked-uuid-1234');

      expect(result.meta.originalName).toBe('avatar.png');
      expect(result.meta.ownerId).toBe('client-1');
      expect(result.stream).toBeDefined();
    });

    it('should throw 404 for unknown profile fileId', async () => {
      await expect(service.getProfileFile('no-such-id')).rejects.toMatchObject({
        status: 404,
        message: 'Файл профиля не найден',
      });
    });

    it('should delete profile file and remove metadata', async () => {
      mockLobbyManager.getMemberByIp.mockReturnValue(fakeClient);
      await service.uploadProfileFile(mulFile, '10.0.0.1');

      await service.deleteProfileFile('mocked-uuid-1234');

      expect(fs.promises.unlink).toHaveBeenCalled();
      await expect(
        service.getProfileFile('mocked-uuid-1234'),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('should throw 404 when deleting unknown profile file', async () => {
      await expect(
        service.deleteProfileFile('no-such-id'),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ─── metadata persistence ─────────────────────────────────────
  describe('metadata persistence', () => {
    const mulFile = {
      originalname: 'avatar.png',
      path: '/tmp/avatar',
      size: 1024,
    } as any;

    it('should save metadata to JSON on uploadProfileFile', async () => {
      mockLobbyManager.getMemberByIp.mockReturnValue(fakeClient);

      await service.uploadProfileFile(mulFile, '10.0.0.1');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('metadata.json'),
        expect.any(String),
        'utf-8',
      );
      const written = JSON.parse(
        (fs.writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][1],
      );
      expect(written['mocked-uuid-1234']).toBeDefined();
      expect(written['mocked-uuid-1234'].ownerId).toBe('client-1');
    });

    it('should save metadata to JSON on deleteProfileFile', async () => {
      mockLobbyManager.getMemberByIp.mockReturnValue(fakeClient);
      await service.uploadProfileFile(mulFile, '10.0.0.1');
      vi.clearAllMocks();
      // Снова мокнём getMemberByIp, т.к. clearAllMocks сбросил его
      mockLobbyManager.getMemberByIp.mockReturnValue(fakeClient);
      await service.uploadProfileFile(
        { ...mulFile, originalname: 'avatar2.png' },
        '10.0.0.1',
      );
      // Теперь удаляем
      await service.deleteProfileFile('mocked-uuid-1234');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('metadata.json'),
        expect.any(String),
        'utf-8',
      );
    });

    it('should load metadata from JSON on startup', async () => {
      const existingMeta = {
        'existing-file': {
          path: '/some/path/avatar.png',
          originalName: 'avatar.png',
          ownerId: 'user-42',
          createdAt: 1000,
        },
      };
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        JSON.stringify(existingMeta),
      );

      const freshService = new FileManagerService(
        mockCallManager as unknown as CallManagerLike,
        mockLobbyManager as unknown as LobbyManagerLike,
      );

      const result = await freshService.getProfileFile('existing-file');
      expect(result.meta.ownerId).toBe('user-42');
      expect(result.meta.originalName).toBe('avatar.png');
    });

    it('should handle missing metadata JSON gracefully on startup', () => {
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        undefined,
      );

      // Не должна выбросить ошибку при старте
      expect(
        () =>
          new FileManagerService(
            mockCallManager as unknown as CallManagerLike,
            mockLobbyManager as unknown as LobbyManagerLike,
          ),
      ).not.toThrow();
    });

    it('should handle garbage metadata JSON gracefully on startup', () => {
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        'not json at all',
      );

      expect(
        () =>
          new FileManagerService(
            mockCallManager as unknown as CallManagerLike,
            mockLobbyManager as unknown as LobbyManagerLike,
          ),
      ).not.toThrow();
    });

    it('should clean up orphaned profile files on cleanDownloads', async () => {
      // Загрузим файл профиля
      mockLobbyManager.getMemberByIp.mockReturnValue(fakeClient);
      await service.uploadProfileFile(mulFile, '10.0.0.1');

      // Мокнём readdir — возвращаем файл, которого нет в метаданных
      const orphanedDirent = { isFile: () => true, name: 'orphan-xyz.png' };
      (fs.promises.readdir as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        orphanedDirent,
      ]);

      await service.cleanDownloads();

      // Файл профиля не должен быть удалён (cleanDownloads работает только с chat/)
      expect(fs.promises.unlink).not.toHaveBeenCalledWith(
        expect.stringContaining('profile'),
      );
    });
  });
});
