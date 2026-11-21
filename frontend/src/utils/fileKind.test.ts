import { describe, expect, it } from "vitest";

import {
  getAttachmentKind,
  isAudioFile,
  isVideoFile,
} from "./fileKind";

describe("isVideoFile", () => {
  it("распознаёт популярные видеоформаты", () => {
    expect(isVideoFile("clip.mp4")).toBe(true);
    expect(isVideoFile("clip.MKV")).toBe(true);
    expect(isVideoFile("record.WEBM")).toBe(true);
    expect(isVideoFile("trailer.mov")).toBe(true);
  });

  it("учитывает путь перед именем", () => {
    expect(isVideoFile("videos/2026/clip.mp4")).toBe(true);
    expect(isVideoFile("C:\\Videos\\clip.mkv")).toBe(true);
  });

  it("не считает видео картинки и документы", () => {
    expect(isVideoFile("photo.png")).toBe(false);
    expect(isVideoFile("report.pdf")).toBe(false);
    expect(isVideoFile("no-extension")).toBe(false);
    expect(isVideoFile(".mp4")).toBe(false);
  });
});

describe("isAudioFile", () => {
  it("распознаёт популярные аудиоформаты", () => {
    expect(isAudioFile("song.mp3")).toBe(true);
    expect(isAudioFile("voice.M4A")).toBe(true);
    expect(isAudioFile("track.flac")).toBe(true);
    expect(isAudioFile("sound.ogg")).toBe(true);
    expect(isAudioFile("stream.opus")).toBe(true);
  });

  it("не считает аудио видео и документы", () => {
    expect(isAudioFile("clip.mp4")).toBe(false);
    expect(isAudioFile("notes.txt")).toBe(false);
    expect(isAudioFile("")).toBe(false);
  });
});

describe("getAttachmentKind", () => {
  it("определяет вид вложения", () => {
    expect(getAttachmentKind("photo.png")).toBe("image");
    expect(getAttachmentKind("clip.mp4")).toBe("video");
    expect(getAttachmentKind("sound.ogg")).toBe("audio");
    expect(getAttachmentKind("song.mp3")).toBe("audio");
    expect(getAttachmentKind("report.pdf")).toBe("file");
  });

  it("картинка имеет приоритет над остальными проверками", () => {
    expect(getAttachmentKind("animation.gif")).toBe("image");
  });
});
