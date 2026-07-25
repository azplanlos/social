declare module "simple-image-viewer-react19" {
  import * as React from "react";

  export interface SimpleImageViewerProps {
    src: string[];
    alt?: string[];
    currentIndex?: number;
    backgroundStyle?: React.CSSProperties;
    imageStyle?: React.CSSProperties;
    captionStyle?: React.CSSProperties;
    disableScroll?: boolean;
    disableCaption?: boolean;
    closeOnClickOutside?: boolean;
    closeOnClickInside?: boolean;
    onClose?: () => void;
    closeComponent?: React.JSX.Element;
    leftArrowComponent?: React.JSX.Element;
    rightArrowComponent?: React.JSX.Element;
  }

  const ReactSimpleImageViewer: React.FC<SimpleImageViewerProps>;
  export default ReactSimpleImageViewer;
}
