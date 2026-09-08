import type { ReactElement } from "react";
import { formatBytes } from "../../utils/formatBytes";
import { FileUploadIcon } from "../Icons";
import * as Styles from "./FileInfo.styles";

interface FileInfoProps {
  file: File;
  className?: string;
  icon?: ReactElement;
}

export function FileInfo(props: FileInfoProps) {
  return (
    <Styles.Container className={props.className}>
      {props.icon || <FileUploadIcon />}
      <Styles.InfoContainer>
        <Styles.FileName>{props.file.name}</Styles.FileName>
        <Styles.FileSize>
          Размер: {formatBytes(props.file.size)}
        </Styles.FileSize>
      </Styles.InfoContainer>
    </Styles.Container>
  );
}
