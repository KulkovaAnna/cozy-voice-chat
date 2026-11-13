import { describe, expect, it } from "vitest";

import {
  extractClipboardFiles,
  extractDroppedFiles,
  isFileDrag,
  namePastedFile,
} from "./attachments";

type MockFileItem = {
  kind: "file" | "string";
  type: string;
  getAsFile: () => File | null;
};

function createFile(name = "document.pdf", size = 4, type = "application/pdf") {
  return new File([new Uint8Array(size)], name, { type });
}

function fileItem(file: File): MockFileItem {
  return { kind: "file", type: file.type, getAsFile: () => file };
}

function createDataTransfer(
  items: MockFileItem[],
  files: File[] = [],
  types: string[] = ["Files"],
): DataTransfer {
  return { items, files, types } as unknown as DataTransfer;
}

describe("isFileDrag", () => {
  it("false без dataTransfer", () => {
    expect(isFileDrag(null)).toBe(false);
  });

  it("true, если среди types есть Files", () => {
    expect(
      isFileDrag(createDataTransfer([], [], ["Files", "text/plain"])),
    ).toBe(true);
  });

  it("false для перетаскивания текста и ссылок", () => {
    expect(
      isFileDrag(createDataTransfer([], [], ["text/plain", "text/uri-list"])),
    ).toBe(false);
  });

  it("true по files, если types пустые", () => {
    expect(isFileDrag(createDataTransfer([], [createFile()], []))).toBe(true);
  });
});

describe("extractDroppedFiles", () => {
  it("null → пустой массив", () => {
    expect(extractDroppedFiles(null)).toEqual([]);
  });

  it("берёт только файловые items", () => {
    const file = createFile("photo.png", 8, "image/png");
    const dataTransfer = createDataTransfer([
      fileItem(file),
      { kind: "string", type: "text/plain", getAsFile: () => null },
    ]);

    expect(extractDroppedFiles(dataTransfer)).toEqual([file]);
  });

  it("пропускает item без файла", () => {
    const dataTransfer = createDataTransfer([
      { kind: "file", type: "image/png", getAsFile: () => null },
    ]);

    expect(extractDroppedFiles(dataTransfer)).toEqual([]);
  });

  it("пропускает папки (size=0, type='')", () => {
    const folder = createFile("folder", 0, "");
    const dataTransfer = createDataTransfer([fileItem(folder)]);

    expect(extractDroppedFiles(dataTransfer)).toEqual([]);
  });

  it("откатывается на files, если items пустые", () => {
    const file = createFile();
    const folder = createFile("folder", 0, "");
    const dataTransfer = createDataTransfer([], [file, folder]);

    expect(extractDroppedFiles(dataTransfer)).toEqual([file]);
  });
});

describe("extractClipboardFiles", () => {
  it("достаёт картинку из items", () => {
    const image = createFile("image.png", 16, "image/png");
    const dataTransfer = createDataTransfer([fileItem(image)]);

    expect(extractClipboardFiles(dataTransfer)).toEqual([image]);
    expect(extractClipboardFiles(null)).toEqual([]);
  });

  it("достаёт скопированный файл из files", () => {
    const file = createFile("report.pdf");
    const dataTransfer = createDataTransfer([], [file], []);

    expect(extractClipboardFiles(dataTransfer)).toEqual([file]);
  });
});

describe("namePastedFile", () => {
  const NOW = new Date(2026, 10, 13, 22, 54, 27);

  it("переименовывает image.png скриншота", () => {
    const file = createFile("image.png", 12, "image/png");
    const renamed = namePastedFile(file, NOW);

    expect(renamed.name).toBe("Pasted image 20261113225427.png");
    expect(renamed.type).toBe("image/png");
    expect(renamed.size).toBe(file.size);
  });

  it("переименовывает blob без MIME-типа", () => {
    const file = createFile("blob", 12, "");
    const renamed = namePastedFile(file, NOW);

    expect(renamed.name).toBe("Pasted file 20261113225427.bin");
  });

  it("подставляет расширение по MIME-типу", () => {
    const file = createFile("image", 12, "image/jpeg");
    const renamed = namePastedFile(file, NOW);

    expect(renamed.name).toBe("Pasted image 20261113225427.jpg");
  });

  it("не меняет файл с нормальным именем", () => {
    const file = createFile("report.pdf");

    expect(namePastedFile(file, NOW)).toBe(file);
  });
});
