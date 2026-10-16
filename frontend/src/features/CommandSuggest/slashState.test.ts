import { describe, expect, it } from "vitest";
import { computeSlashState } from "./slashState";

describe("computeSlashState", () => {
  it("неактивен без слэша", () => {
    expect(computeSlashState("")).toEqual({ active: false, query: "" });
    expect(computeSlashState("привет мир")).toEqual({
      active: false,
      query: "",
    });
  });

  it("активен на голом слэше с пустым запросом", () => {
    expect(computeSlashState("/")).toEqual({ active: true, query: "" });
  });

  it("активен при частичном вводе команды", () => {
    expect(computeSlashState("/he")).toEqual({ active: true, query: "he" });
    expect(computeSlashState("/debug-info")).toEqual({
      active: true,
      query: "debug-info",
    });
  });

  it("активен после пробела перед слэшем", () => {
    expect(computeSlashState("привет /he")).toEqual({
      active: true,
      query: "he",
    });
  });

  it("неактивен, когда слэш часть слова (URL)", () => {
    expect(computeSlashState("https://example.com/path")).toEqual({
      active: false,
      query: "",
    });
  });

  it("неактивен после пробела за командой", () => {
    expect(computeSlashState("/help ")).toEqual({ active: false, query: "" });
    expect(computeSlashState("/poll да")).toEqual({ active: false, query: "" });
  });
});
