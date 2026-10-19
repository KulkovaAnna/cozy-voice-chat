import styled from "@emotion/styled";

export const Bar = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background-color: ${({ theme }) => theme.colors.background.card};
  border-top: 1px solid ${({ theme }) => theme.colors.background.darker};
  font-size: 13px;
  min-height: 36px;
`;

export const TrackInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

export const TrackTitle = styled.div`
  flex: 0 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 500;
`;

export const TrackLink = styled.a`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.primary.main};
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    text-decoration: underline;
  }
`;

export const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

export const ControlButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.paper};
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

export const StopButton = styled(ControlButton)`
  color: ${({ theme }) => theme.colors.text.secondary};

  &:hover {
    color: ${({ theme }) => theme.colors.status.error};
  }
`;

/** Кнопки ⏮ / ⏭ — компактнее основной Play/Pause */
export const SkipButton = styled(ControlButton)`
  color: ${({ theme }) => theme.colors.text.secondary};
`;

/** Контейнер громкости: иконка мута + слайдер */
export const VolumeControls = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  flex-grow: 1;
`;

/** Кнопка мута — компактная, в стиле ControlButton */
export const MuteButton = styled(ControlButton)`
  font-size: 10px;
  padding: 2px;
`;

/** Название трека и счётчик очереди в одну строку */
export const TrackLine = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`;

/** Счётчик вида «3 / 50» — клик раскрывает список треков */
export const QueueCounter = styled.button`
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0 4px;
  border-radius: 3px;
  font-size: 11px;
  line-height: 16px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.paper};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

/** Трек-лист: выезжает над полоской и не занимает место в макете */
export const QueuePanel = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 0;
  background-color: ${({ theme }) => theme.colors.background.card};
  border-top: 1px solid ${({ theme }) => theme.colors.background.darker};
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.25);
`;

/** Строка трек-листа (только просмотр — управление идёт кнопками ⏮ ⏭) */
export const QueueItem = styled.div<{ $current: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 8px;
  font-size: 12px;
  color: ${({ $current, theme }) =>
    $current ? theme.colors.primary.main : theme.colors.text.primary};
  font-weight: ${({ $current }) => ($current ? 600 : 400)};
`;

export const QueueItemIndex = styled.span`
  flex-shrink: 0;
  width: 22px;
  text-align: right;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const QueueItemTitle = styled.span`
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const QueueItemDuration = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const TrackTime = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  flex-shrink: 0;
`;
