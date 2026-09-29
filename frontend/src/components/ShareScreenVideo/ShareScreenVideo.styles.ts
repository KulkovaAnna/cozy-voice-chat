import styled from "@emotion/styled";
import type { ShareScreenVideoProps } from "./ShareScreenVideo";

export const Video = styled.video<
  Pick<ShareScreenVideoProps, "height" | "width">
>`
  width: 300px;
  height: 150px;
  height: ${({ height }) => height || "100%"};
  width: ${({ width }) => width || "100%"};
`;

export const BlackScreen = styled.div<
  Pick<ShareScreenVideoProps, "height" | "width">
>`
  background-color: ${({ theme }) => theme.colors.background.paper};
  display: flex;
  align-items: center;
  justify-content: center;
  height: ${({ height }) => height || "100%"};
  width: ${({ width }) => width || "100%"};
`;
