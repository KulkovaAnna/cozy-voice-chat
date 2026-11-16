import type { UserProfile } from "@cvc/types";

/**
 * Кандидаты на приглашение в комнату: участники лобби без себя, без тех,
 * кто уже в этом звонке, и без пустых имён. Исходный массив не меняется.
 */
export function getInviteCandidates(
  lobbyMembers: UserProfile[],
  callMemberIds: Iterable<string>,
  myId?: string,
): UserProfile[] {
  const excluded = new Set(callMemberIds);
  if (myId) excluded.add(myId);

  return lobbyMembers
    .filter(
      (member) =>
        typeof member.id === "string" &&
        member.id.length > 0 &&
        !excluded.has(member.id) &&
        !!member.name,
    )
    .sort((a, b) => (a.name > b.name ? 1 : -1));
}
