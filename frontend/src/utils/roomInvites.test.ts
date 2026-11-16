import { describe, expect, it } from "vitest";

import type { UserProfile } from "@cvc/types";

import { getInviteCandidates } from "./roomInvites";

const member = (id: string, name: string): UserProfile => ({
  id,
  name,
  avatar: "",
});

describe("getInviteCandidates", () => {
  it("исключает самого себя", () => {
    const lobby = [member("me", "Я"), member("b", "Боб")];

    const result = getInviteCandidates(lobby, [], "me");

    expect(result.map((user) => user.id)).toEqual(["b"]);
  });

  it("исключает участников текущего звонка", () => {
    const lobby = [
      member("me", "Я"),
      member("b", "Боб"),
      member("c", "Чарли"),
    ];

    const result = getInviteCandidates(lobby, ["me", "c"], "me");

    expect(result.map((user) => user.id)).toEqual(["b"]);
  });

  it("отбрасывает участников без id и без имени", () => {
    const lobby = [
      { name: "Без id", avatar: "" },
      member("b", ""),
      member("c", "Чарли"),
    ] as UserProfile[];

    const result = getInviteCandidates(lobby, [], "me");

    expect(result.map((user) => user.name)).toEqual(["Чарли"]);
  });

  it("сортирует по имени и не меняет исходный массив", () => {
    const lobby = [member("c", "Чарли"), member("a", "Алиса")];

    const result = getInviteCandidates(lobby, [], "me");

    expect(result.map((user) => user.name)).toEqual(["Алиса", "Чарли"]);
    expect(lobby.map((user) => user.name)).toEqual(["Чарли", "Алиса"]);
  });

  it("возвращает пустой список, если приглашать некого", () => {
    expect(getInviteCandidates([], [], "me")).toEqual([]);
  });
});
