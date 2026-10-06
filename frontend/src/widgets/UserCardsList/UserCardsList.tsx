import { Column, Row } from "@cvc/components";
import { useTextChat } from "@cvc/providers";
import type { CallMember } from "@cvc/types";
import { UserCard } from "../UserCard";

export type UserCardsListProps = {
  members: CallMember[];
  myId: string;
  volume: number;
  onVolumeChange: (volume: number) => void;
  compact: boolean;
};

/**
 * Список карточек участников звонка.
 * Читает реакцию из контекста чата, поэтому должен рендериться внутри TextChatProvider.
 */
export function UserCardsList(props: UserCardsListProps) {
  const { members, myId, volume, onVolumeChange, compact } = props;
  const { emojiReaction } = useTextChat();

  const Container = compact ? Row : Column;

  return (
    <Container>
      {members.map(({ member, isSpeaking, isMuted }) => (
        <UserCard
          key={member.id}
          user={member}
          isSpeaking={isSpeaking}
          isMuted={isMuted}
          variant={compact ? "compact" : "standard"}
          emojiReaction={
            emojiReaction && emojiReaction.senderId === member.id
              ? emojiReaction.emoji
              : null
          }
          volume={
            member.id !== myId ? { value: volume, onVolumeChange } : undefined
          }
        />
      ))}
    </Container>
  );
}
