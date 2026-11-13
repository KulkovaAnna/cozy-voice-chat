import { describe, expect, it } from "vitest";

import {
  appendAttachments,
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

describe("appendAttachments", () => {
  it("добавляет файлы к уже выбранным", () => {
    const first = createFile("a.pdf");
    const second = createFile("b.pdf");
    const third = createFile("c.pdf");

    const result = appendAttachments([first], [second, third]);

    expect(result.files).toEqual([first, second, third]);
    expect(result.rejected).toBe(0);
  });

  it("игнорирует дубли по имени, размеру и времени изменения", () => {
    const file = createFile("a.pdf");
    const duplicate = new File([file], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });

    const result = appendAttachments([file], [duplicate]);

    expect(result.files).toEqual([file]);
    expect(result.rejected).toBe(0);
  });

  it("не добавляет больше лимита и считает отброшенные", () => {
    const current = Array.from({ length: 9 }, (_, i) =>
      createFile(`file-${i}.pdf`),
    );
    const incoming = [
      createFile("new-1.pdf"),
      createFile("new-2.pdf"),
      createFile("new-3.pdf"),
    ];

    const result = appendAttachments(current, incoming);

    expect(result.files).toHaveLength(10);
    expect(result.files[9].name).toBe("new-1.pdf");
    expect(result.rejected).toBe(2);
  });

  it("уважает переданный лимит", () => {
    const result = appendAttachments(
      [],
      [createFile("a.pdf"), createFile("b.pdf")],
      1,
    );

    expect(result.files).toHaveLength(1);
    expect(result.rejected).toBe(1);
  });

  it("с пустым списком ничего не меняет", () => {
    const file = createFile("a.pdf");
    const result = appendAttachments([file], []);

    expect(result.files).toEqual([file]);
    expect(result.rejected).toBe(0);
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
