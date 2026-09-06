import { debounce } from "lodash";
import {
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { createPortal } from "react-dom";
import * as Styles from "./SidePanel.styles";
import { CloseIcon } from "../Icons";

export interface SidePanelProps {
  isOpen: boolean;
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

  useEffect(() => {
    window.addEventListener("resize", debouncedResizeHandler);

    return () => {
      window.removeEventListener("resize", debouncedResizeHandler);
    };
  }, [debouncedResizeHandler]);

  return createPortal(
    <Styles.Container $topOffset={headerHeight} $isOpen={props.isOpen}>
      <Styles.CloseButton $topOffset={headerHeight} onClick={props.onClose}>
        <CloseIcon />
      </Styles.CloseButton>
      {props.children}
    </Styles.Container>,
    document.body,
  );
}
