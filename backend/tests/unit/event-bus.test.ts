import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import eventBus from '../../src/utils/event-bus';
import type { FileUploadedEvent, FileDeletedEvent } from '../../src/app/modules/file-manager/file-manager.types';

describe('EventBus', () => {
  afterEach(() => {
    // Удаляем всех слушателей после каждого теста
    eventBus.removeAllListeners('file:uploaded');
    eventBus.removeAllListeners('file:deleted');
  });

  // ─── file:uploaded ────────────────────────────────────────────
  describe('file:uploaded', () => {
    it('should call listener when event is emitted', () => {
      const handler = vi.fn();
      eventBus.on('file:uploaded', handler);

      const payload: FileUploadedEvent = {
        fileId: 'file-1',
        originalName: 'doc.pdf',
        size: 1024,
        callId: 'call-1',
        senderIp: '192.168.1.1',
      };

      eventBus.emit('file:uploaded', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('should support multiple listeners', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on('file:uploaded', handler1);
      eventBus.on('file:uploaded', handler2);

      const payload: FileUploadedEvent = {
        fileId: 'file-2',
        originalName: 'img.png',
        size: 2048,
        callId: 'call-2',
        senderIp: '10.0.0.5',
      };

      eventBus.emit('file:uploaded', payload);

      expect(handler1).toHaveBeenCalledWith(payload);
      expect(handler2).toHaveBeenCalledWith(payload);
    });

    it('should not call listener after removeAllListeners', () => {
      const handler = vi.fn();
      eventBus.on('file:uploaded', handler);
      eventBus.removeAllListeners('file:uploaded');

      eventBus.emit('file:uploaded', {
        fileId: 'f',
        originalName: 'a',
        size: 0,
        callId: 'c',
        senderIp: 'ip',
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not call listener after removeListener', () => {
      const handler = vi.fn();
      eventBus.on('file:uploaded', handler);
      eventBus.removeListener('file:uploaded', handler);

      eventBus.emit('file:uploaded', {
        fileId: 'f',
        originalName: 'a',
        size: 0,
        callId: 'c',
        senderIp: 'ip',
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ─── file:deleted ─────────────────────────────────────────────
  describe('file:deleted', () => {
    it('should call listener when event is emitted', () => {
      const handler = vi.fn();
      eventBus.on('file:deleted', handler);

      const payload: FileDeletedEvent = {
        fileId: 'file-3',
        callId: 'call-3',
        originalName: 'video.mp4',
        size: 5_000_000,
      };

      eventBus.emit('file:deleted', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('should support multiple listeners', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on('file:deleted', handler1);
      eventBus.on('file:deleted', handler2);

      const payload: FileDeletedEvent = {
        fileId: 'file-4',
        callId: 'call-4',
        originalName: 'song.mp3',
        size: 3_000_000,
      };

      eventBus.emit('file:deleted', payload);

      expect(handler1).toHaveBeenCalledWith(payload);
      expect(handler2).toHaveBeenCalledWith(payload);
    });
  });

  // ─── cross-event isolation ────────────────────────────────────
  describe('event isolation', () => {
    it('should not cross-fire between file:uploaded and file:deleted', () => {
      const uploadHandler = vi.fn();
      const deleteHandler = vi.fn();
      eventBus.on('file:uploaded', uploadHandler);
      eventBus.on('file:deleted', deleteHandler);

      eventBus.emit('file:uploaded', {
        fileId: 'f1',
        originalName: 'a.txt',
        size: 100,
        callId: 'c1',
        senderIp: '1.1.1.1',
      });

      expect(uploadHandler).toHaveBeenCalledTimes(1);
      expect(deleteHandler).not.toHaveBeenCalled();
    });
  });

  // ─── once ─────────────────────────────────────────────────────
  describe('once', () => {
    it('should call listener only once', () => {
      const handler = vi.fn();
      eventBus.once('file:uploaded', handler);

      const payload: FileUploadedEvent = {
        fileId: 'f',
        originalName: 'a',
        size: 0,
        callId: 'c',
        senderIp: 'ip',
      };

      eventBus.emit('file:uploaded', payload);
      eventBus.emit('file:uploaded', payload);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
