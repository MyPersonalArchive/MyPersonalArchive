// LocalViewer.tsx
import { useEffect, useState } from "react";
import { BaseViewer, BaseViewerProps } from "./BaseViewer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpRightAndDownLeftFromCenter, faDownLeftAndUpRightToCenter, faTrash } from "@fortawesome/free-solid-svg-icons";

interface LocalViewerProps extends BaseViewerProps {
  blob: Blob
  fileName?: string
  removeBlob?: (fileName: string) => void
  onMaximize?: () => void
  onMinimize?: () => void
}

export const LocalViewer = ({ blob, fileName, mimeType, dimension, children, removeBlob, onMaximize, onMinimize }: LocalViewerProps) => {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    const blobUrl = URL.createObjectURL(blob);
    setSrc(blobUrl);
    return () => URL.revokeObjectURL(blobUrl);
  }, [blob]);

  const controls = (
    <>
      {onMaximize && (
        <button type="button" onClick={onMaximize} title="Expand">
          <FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} size="1x" />
        </button>
      )}
      {onMinimize && (
        <button type="button" onClick={onMinimize} title="Minimize">
          <FontAwesomeIcon icon={faDownLeftAndUpRightToCenter} size="1x" />
        </button>
      )}
      {removeBlob && fileName && (
        <button type="button" onClick={() => removeBlob(fileName)} title="Delete">
          <FontAwesomeIcon icon={faTrash} size="1x" />
        </button>
      )}
      {children}
    </>
  );

  return <BaseViewer src={src} mimeType={mimeType || blob.type} dimension={dimension} children={controls}/>;
};
