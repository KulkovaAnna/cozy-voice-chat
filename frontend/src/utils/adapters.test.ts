import { describe, expect, it } from "vitest";

import type { CallInfoDTO, UserDTO } from "@cvc/types";
import { callInfoAdapter } from "./adapters";

const alice: UserDTO = {
  id: "alice-id",
  ip: "10.0.0.1",
  connectionDate: "2026-01-01T00:00:00.000Z",
  personalInfo: { name: "Alice", avatar: "alice.png" },
};

const bob: UserDTO = {
  id: "bob-id",
  ip: "10.0.0.2",
  connectionDate: "2026-01-01T00:00:01.000Z",
  personalInfo: { name: "Bob", avatar: "bob.png" },
};

function member(client: UserDTO) {
  return {
    client,
    isMuted: false,
    isSpeaking: false,
    online: true,
    isScreenSharing: false,
  };
}

describe("callInfoAdapter", () => {
  it("maps a group room without receiver", () => {
    const dto: CallInfoDTO = {
      id: "room-1",
      type: "group",
      roomCode: "ABC123",
      initiator: alice,
      receiver: null,
      members: [member(alice), member(bob)],
    };

    const call = callInfoAdapter(dto);

    expect(call.type).toBe("group");
    expect(call.roomCode).toBe("ABC123");
    expect(call.receiver).toBeNull();
    expect(call.members).toHaveLength(2);
    expect(call.members[1].member.name).toBe("Bob");
  });

  it("maps a direct call with receiver", () => {
    const dto: CallInfoDTO = {
      id: "call-1",
      type: "direct",
      initiator: alice,
      receiver: bob,
      members: [member(alice), member(bob)],
    };

    const call = callInfoAdapter(dto);

    expect(call.type).toBe("direct");
    expect(call.roomCode).toBeNull();
    expect(call.receiver?.id).toBe("bob-id");
  });
});
