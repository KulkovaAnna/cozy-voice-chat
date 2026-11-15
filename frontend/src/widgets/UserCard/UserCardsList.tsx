import { useTheme } from "@emotion/react";
import { useCallback, useState } from "react";

import { Column } from "@cvc/components";
import { useTextChat } from "@cvc/providers";
import type { CallMember } from "@cvc/types";
import { getFittingColumns, getUserCardsLayout } from "@cvc/utils";
import { USER_CARD_WIDTH } from "./constants";
import * as Styles from "./UserCardsList.styles";
import { UserCard } from "./UserCard";

export type UserCardsListProps = {
  members: CallMember[];
  myId: string;
  volumes: Record<string, number>;
  onVolumeChange: (memberId: string, volume: number) => void;
  compact: boolean;
};

export function UserCardsList(props: UserCardsListProps) {
  const { members, myId, volumes, onVolumeChange, compact } = props;
  const { emojiReaction } = useTextChat();
  const theme = useTheme();
  // Ширину сетки измеряем, чтобы не сжимать карточки: три колонки включаются,
  // только когда карточки стандартной ширины реально помещаются, иначе — две
  // или одна (на телефоне карточка занимает всю строку).
  const [gridWidth, setGridWidth] = useState<number | null>(null);

  const measureGrid = useCallback((node: HTMLDivElement | null) => {
    if (!node || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setGridWidth(entry.contentRect.width);
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const maxColumns =
    gridWidth === null
      ? undefined
      : getFittingColumns(
          gridWidth,
          USER_CARD_WIDTH,
          parseInt(theme.spacing.layout.medium),
        );

  // Для группы из 3+ участников колонка/строка выглядит тесно — сетка.
  // Раскладка зависит от числа участников и доступной ширины: если их не
  // хватает на ровные ряды, карточка занимает несколько ячеек (например,
  // третья — во всю ширину).
  const layout =
    !compact && members.length > 2
      ? getUserCardsLayout(members.length, maxColumns)
      : null;

  const cards = members.map(({ member, isSpeaking, isMuted }, index) => {
    const memberId = member.id ?? "";

    return (
      <Styles.Cell key={memberId} $span={layout?.spans[index]}>
        <UserCard
          user={member}
          isSpeaking={isSpeaking}
          isMuted={isMuted}
          variant={compact ? "compact" : "standard"}
          stretch={layout !== null}
          emojiReaction={
            emojiReaction && emojiReaction.senderId === memberId
              ? emojiReaction.emoji
              : null
          }
          volume={
            memberId !== myId
              ? {
                  value: volumes[memberId] ?? 1,
                  onVolumeChange: (value: number) =>
                    onVolumeChange(memberId, value),
                }
              : undefined
          }
        />
      </Styles.Cell>
    );
  });

  if (layout) {
    return (
      <Styles.Grid ref={measureGrid} $units={layout.units}>
        {cards}
      </Styles.Grid>
    );
  }

  if (compact) {
    return <Styles.StyledRow withScroll>{cards}</Styles.StyledRow>;
  }

  return <Column>{cards}</Column>;
}
