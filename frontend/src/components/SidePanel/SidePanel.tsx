import {
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import { debounce } from "lodash";
import { createPortal } from "react-dom";

import { CloseIcon } from "../Icons";
import * as Styles from "./SidePanel.styles";

export interface SidePanelProps {
  isOpen: boolean;
  zIndex?: number;
  noTopOffset?: boolean;
  onClose?: VoidFunction;
}

function getPageHeaderHeight() {
  const pageHeader = document.getElementById("page-header");
  return pageHeader?.clientHeight || 0;
}

export function SidePanel(props: PropsWithChildren<SidePanelProps>) {
  const [headerHeight, setHeaderHeight] = useState(getPageHeaderHeight());
  const handleResize = useCallback(() => {
    setHeaderHeight(getPageHeaderHeight());
  }, []);

  const debouncedResizeHandler = debounce(handleResize, 200);

  const topOffset = props.noTopOffset ? 0 : headerHeight;

  useEffect(() => {
    window.addEventListener("resize", debouncedResizeHandler);

    return () => {
      window.removeEventListener("resize", debouncedResizeHandler);
    };
  }, [debouncedResizeHandler]);

  return createPortal(
    <Styles.Container
      $topOffset={topOffset}
      $isOpen={props.isOpen}
      $zIndex={props.zIndex}
    >
      <Styles.CloseButton $topOffset={topOffset} onClick={props.onClose}>
        <CloseIcon />
      </Styles.CloseButton>
      {props.children}
    </Styles.Container>,
    document.body,
  );
}
