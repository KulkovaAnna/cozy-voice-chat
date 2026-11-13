import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import FileManagerService from '../../src/app/modules/file-manager/file-manager.service';
import type {
  CallManagerLike,
  LobbyManagerLike,
  UploadedFile,
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

function makeFile(
  name: string,
  size = 100,
  filePath = `/tmp/${name}`,
): UploadedFile {
  return { originalname: name, path: filePath, size };
}

describe('FileManagerService', () => {
  let service: FileManagerService;
  let mockCallManager: { getCallById: ReturnType<typeof vi.fn> };
  let mockLobbyManager: {
    getMemberById: ReturnType<typeof vi.fn>;
    getMemberByIp: ReturnType<typeof vi.fn>;
  };

  const fakeClient = { id: 'client-1', name: 'Anna', ip: '10.0.0.1' };
  const otherClient = { id: 'client-2', name: 'Bob', ip: '10.0.0.2' };
  const fakeCall = { id: 'call-1', members: [{ client: fakeClient }] };

  /** Готовит успешный сценарий: клиент в лобби и в звонке */
  function mockHappyPath(): void {
    mockLobbyManager.getMemberById.mockReturnValue(fakeClient);
    mockCallManager.getCallById.mockReturnValue(fakeCall);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallManager = { getCallById: vi.fn() };
    mockLobbyManager = {
      getMemberById: vi.fn(),
      getMemberByIp: vi.fn(),
    };
    service = new FileManagerService(
      mockCallManager as unknown as CallManagerLike,
      mockLobbyManager as unknown as LobbyManagerLike,
    );
  });

  // ─── uploadAttachments ────────────────────────────────────────
  describe('uploadAttachments', () => {
    it('should throw 400 if callId is missing', async () => {
      await expect(
        service.uploadAttachments(
          [makeFile('a.txt')],
          '10.0.0.1',
          '',
          'client-1',
        ),
      ).rejects.toMatchObject({ status: 400, message: 'Не указан callId' });
    });

    it('should throw 400 if clientId is missing', async () => {
      await expect(
        service.uploadAttachments(
          [makeFile('a.txt')],
          '10.0.0.1',
          'call-1',
          '',
        ),
      ).rejects.toMatchObject({ status: 400, message: 'Не указан clientId' });
    });

    it('should throw 400 if no files provided', async () => {
      await expect(
        service.uploadAttachments([], '10.0.0.1', 'call-1', 'client-1'),
      ).rejects.toMatchObject({ status: 400, message: 'Файлы не загружены' });
    });

    it('should throw 400 if more than 10 files provided', async () => {
      const files = Array.from({ length: 11 }, (_, i) =>
        makeFile(`f${i}.txt`),
      );

      await expect(
        service.uploadAttachments(files, '10.0.0.1', 'call-1', 'client-1'),
      ).rejects.toMatchObject({
        status: 400,
        message: 'За один раз можно прикрепить не больше 10 файлов',
      });
    });

    it('should throw 404 if sender is not found', async () => {
      mockLobbyManager.getMemberById.mockReturnValue(undefined);
      mockLobbyManager.getMemberByIp.mockReturnValue(undefined);

      await expect(
        service.uploadAttachments(
          [makeFile('a.txt')],
          '10.0.0.1',
          'call-1',
          'unknown',
        ),
      ).rejects.toMatchObject({
        status: 404,
        message: 'Отправитель не найден',
      });
    });
    it('should throw 403 if clientId belongs to another IP', async () => {
      mockLobbyManager.getMemberById.mockReturnValue(fakeClient);

      await expect(
        service.uploadAttachments(
          [makeFile('a.txt')],
          '10.0.0.99',
          'call-1',
          'client-1',
        ),
      ).rejects.toMatchObject({
        status: 403,
        message: 'Нельзя загружать файлы от имени другого клиента',
      });
    });

    it('should fall back to IP lookup when clientId is unknown', async () => {
      mockLobbyManager.getMemberById.mockReturnValue(undefined);
      mockLobbyManager.getMemberByIp.mockReturnValue(fakeClient);
      mockCallManager.getCallById.mockReturnValue(fakeCall);

      const result = await service.uploadAttachments(
        [makeFile('a.txt')],
        '10.0.0.1',
        'call-1',
        'stale-id',
      );

      expect(mockLobbyManager.getMemberByIp).toHaveBeenCalledWith('10.0.0.1');
      expect(result).toHaveLength(1);
    });

    it('should throw 404 if call is not found', async () => {
      mockLobbyManager.getMemberById.mockReturnValue(fakeClient);
      mockCallManager.getCallById.mockReturnValue(undefined);

      await expect(
        service.uploadAttachments(
          [makeFile('a.txt')],
          '10.0.0.1',
          'unknown-call',
          'client-1',
        ),
      ).rejects.toMatchObject({ status: 404, message: 'Звонок не найден' });
    });

    it('should throw 403 if sender is not a call member', async () => {
      mockLobbyManager.getMemberById.mockReturnValue(otherClient);
      mockCallManager.getCallById.mockReturnValue(fakeCall);

      await expect(
        service.uploadAttachments(
          [makeFile('a.txt')],
          '10.0.0.2',
          'call-1',
          'client-2',
        ),
      ).rejects.toMatchObject({
        status: 403,
        message: 'Отправитель не является участником звонка',
      });
    });

    it('should rename files and return attachment descriptors', async () => {
      mockHappyPath();
      const { v4 } = await import('uuid');
      const uuid = v4 as ReturnType<typeof vi.fn>;
      uuid.mockReturnValueOnce('file-1').mockReturnValueOnce('file-2');

      const result = await service.uploadAttachments(
        [makeFile('doc.pdf', 1024), makeFile('photo.png', 2048)],
        '10.0.0.1',
        'call-1',
        'client-1',
      );

      expect(result).toEqual([
        { id: 'file-1', fileName: 'doc.pdf', fileSize: 1024 },
        { id: 'file-2', fileName: 'photo.png', fileSize: 2048 },
      ]);
      expect(fs.promises.rename).toHaveBeenCalledTimes(2);
      const targetPath = (fs.promises.rename as ReturnType<typeof vi.fn>).mock
        .calls[0][1];
      expect(targetPath).toContain('file-1.pdf');
    });

    it('should store metadata accessible via downloadFile', async () => {
      mockHappyPath();
      await service.uploadAttachments(
        [makeFile('report.pdf')],
        '10.0.0.1',
        'call-1',
        'client-1',
      );

      const dlResult = await service.downloadFile('mocked-uuid-1234');
      expect(dlResult.filename).toBe('report.pdf');
    });

    it('should roll back saved files if rename fails', async () => {
      mockHappyPath();
      (fs.promises.rename as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('disk full'));

      await expect(
        service.uploadAttachments(
          [makeFile('ok.txt'), makeFile('fail.txt')],
          '10.0.0.1',
          'call-1',
          'client-1',
        ),
      ).rejects.toThrow('disk full');

      expect(fs.promises.unlink).toHaveBeenCalledWith('/tmp/ok.txt');
      expect(fs.promises.unlink).toHaveBeenCalledWith('/tmp/fail.txt');
      await expect(
        service.getFileStream('mocked-uuid-1234'),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ─── claimAttachments ─────────────────────────────────────────
  describe('claimAttachments', () => {
    it('should return empty array for no ids', () => {
      expect(service.claimAttachments([], 'client-1', 'call-1')).toEqual([]);
    });

    it('should throw 400 if more than 10 ids provided', () => {
      const ids = Array.from({ length: 11 }, (_, i) => `file-${i}`);
      expect(() => service.claimAttachments(ids, 'client-1', 'call-1')).toThrow(
        'К сообщению можно прикрепить не больше 10 файлов',
      );
    });

    it('should throw 400 if ids are duplicated', () => {
      expect(() =>
        service.claimAttachments(['file-1', 'file-1'], 'client-1', 'call-1'),
      ).toThrow('Файлы не должны повторяться в одном сообщении');
    });

    it('should throw 404 for unknown file', () => {
      expect(() =>
        service.claimAttachments(['unknown'], 'client-1', 'call-1'),
      ).toThrow('Файл не найден или уже удалён');
    });

    it('should throw 403 when claiming a file of another sender', async () => {
      mockHappyPath();
      await service.uploadAttachments(
        [makeFile('doc.pdf')],
        '10.0.0.1',
        'call-1',
        'client-1',
      );

      expect(() =>
        service.claimAttachments(['mocked-uuid-1234'], 'client-2', 'call-1'),
      ).toThrow('Нельзя прикрепить чужой файл');
    });

    it('should throw 403 when claiming a file of another call', async () => {
      mockHappyPath();
      await service.uploadAttachments(
        [makeFile('doc.pdf')],
        '10.0.0.1',
        'call-1',
        'client-1',
      );

      expect(() =>
        service.claimAttachments(['mocked-uuid-1234'], 'client-1', 'call-2'),
      ).toThrow('Файл принадлежит другому звонку');
    });

    it('should not allow claiming the same file twice', async () => {
      mockHappyPath();
      await service.uploadAttachments(
        [makeFile('doc.pdf')],
        '10.0.0.1',
        'call-1',
        'client-1',
      );

      service.claimAttachments(['mocked-uuid-1234'], 'client-1', 'call-1');
      expect(() =>
        service.claimAttachments(['mocked-uuid-1234'], 'client-1', 'call-1'),
      ).toThrow('Файл уже прикреплён к сообщению');
    });

    it('should validate the whole list before marking files', async () => {
      mockHappyPath();
      const { v4 } = await import('uuid');
      const uuid = v4 as ReturnType<typeof vi.fn>;
      uuid.mockReturnValueOnce('file-1').mockReturnValueOnce('file-2');

      await service.uploadAttachments(
        [makeFile('a.txt'), makeFile('b.txt')],
        '10.0.0.1',
        'call-1',
        'client-1',
      );

      expect(() =>
        service.claimAttachments(['file-1', 'missing'], 'client-1', 'call-1'),
      ).toThrow('Файл не найден или уже удалён');

      // file-1 не должен остаться помеченным после неудачной валидации
      expect(
        service.claimAttachments(['file-1'], 'client-1', 'call-1'),
      ).toEqual([{ id: 'file-1', fileName: 'a.txt', fileSize: 100 }]);
    });

    it('should return attachments for valid ids', async () => {
      mockHappyPath();
      await service.uploadAttachments(
        [makeFile('report.pdf', 1024)],
        '10.0.0.1',
        'call-1',
        'client-1',
      );

      expect(
        service.claimAttachments(['mocked-uuid-1234'], 'client-1', 'call-1'),
      ).toEqual([
        { id: 'mocked-uuid-1234', fileName: 'report.pdf', fileSize: 1024 },
      ]);
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

    it('should return stream and filename without deleting the file', async () => {
      mockHappyPath();
      await service.uploadAttachments(
        [makeFile('doc.txt')],
        '10.0.0.1',
        'call-1',
        'client-1',
      );

      const result = await service.downloadFile('mocked-uuid-1234');

      expect(result.filename).toBe('doc.txt');
      expect(result.stream).toBeDefined();
      // Скачивание не удаляет файл: он ещё нужен другим участникам
      const again = await service.downloadFile('mocked-uuid-1234');
      expect(again.filename).toBe('doc.txt');
      expect(fs.promises.unlink).not.toHaveBeenCalled();
    });
  });

  // ─── getFileStream ────────────────────────────────────────────
  describe('getFileStream', () => {
    it('should throw 404 for unknown fileId', async () => {
      await expect(service.getFileStream('no-such-id')).rejects.toThrow(
        'Файл не найден или удалён',
      );
    });

    it('should return stream and meta for existing file', async () => {
      mockHappyPath();
      await service.uploadAttachments(
        [makeFile('video.mp4', 5000)],
        '10.0.0.1',
        'call-1',
        'client-1',
      );

      const result = await service.getFileStream('mocked-uuid-1234');

      expect(result.meta.originalName).toBe('video.mp4');
      expect(result.meta.senderId).toBe('client-1');
      expect(result.meta.callId).toBe('call-1');
      expect(result.meta.size).toBe(5000);
      expect(result.stream).toBeDefined();
    });
  });

  // ─── cleanDownloads ───────────────────────────────────────────
  describe('cleanDownloads', () => {
    it('should unlink files and clear metadata', async () => {
      mockHappyPath();
      await service.uploadAttachments(
        [makeFile('doc.pdf')],
        '10.0.0.1',
        'call-1',
        'client-1',
      );

      const orphanedDirent = { isFile: () => true, name: 'orphan-xyz.pdf' };
      (fs.promises.readdir as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        orphanedDirent,
      ]);

      await service.cleanDownloads();

      expect(fs.promises.unlink).toHaveBeenCalledWith(
        expect.stringContaining('orphan-xyz.pdf'),
      );
      await expect(
        service.getFileStream('mocked-uuid-1234'),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('should handle readdir error gracefully', async () => {
      (fs.promises.readdir as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('ENOENT'),
      );

      await expect(service.cleanDownloads()).resolves.toBeUndefined();
    });
  });

  // ─── profile files ────────────────────────────────────────────
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

    it('should not touch profile files on cleanDownloads', async () => {
      mockLobbyManager.getMemberByIp.mockReturnValue(fakeClient);
      await service.uploadProfileFile(mulFile, '10.0.0.1');

      const orphanedDirent = { isFile: () => true, name: 'orphan-xyz.png' };
      (fs.promises.readdir as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        orphanedDirent,
      ]);

      await service.cleanDownloads();

      expect(fs.promises.unlink).not.toHaveBeenCalledWith(
        expect.stringContaining('profile'),
      );
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
      mockLobbyManager.getMemberByIp.mockReturnValue(fakeClient);
      await service.uploadProfileFile(
        { ...mulFile, originalname: 'avatar2.png' },
        '10.0.0.1',
      );
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
  });
});
