import { useExplorer } from "reactHooks/fileManager/explorer/explorer.hook";
import { useActiveFile } from "reactHooks/fileManager/activeFile/activeFile.hook";
import { useCallback, useEffect, useRef, useState } from "react";

import { log } from "services/log/log.service";
import { useFileViewerService } from "services/FileViewer/fileViewer.service";
import { useHotkey } from "services/keyboardEvents/useHotkey";

import { useRecoilState } from "recoil";
import { leftDrawerSelector } from "state/localState/leftDrawerState";

import { Img } from "components/Atoms/Img/Img";
import { Icon } from "components/Atoms/Icon/Icon";
import { MimeTypesEnum } from "const/mimeTypes/mimeTypes.const";
import { useDebouncedCallback } from "use-debounce";

import './ImageViewer.css';
import { keyCodes } from "services/keyboardEvents/keyCodes.const";

type Props = {};
type ZoomAnchor = { x: number; y: number };

const minScale = 0.2;
const maxScale = 10;

const binaryStringToUint8Array = binaryStr => {
  if (!binaryStr) return new Uint8Array(0);

  const len = binaryStr.length;
  const uint8Array = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    uint8Array[i] = binaryStr.charCodeAt(i);
  }
  return uint8Array;
}

const ImageViewer: React.FC<Props> = () => {
  const [drawerState, setDraverState] = useRecoilState(leftDrawerSelector);

  const { loadFileFromRS } = useFileViewerService();
  const { getNeighborFileList } = useExplorer();
  const { activeFileInfo, setActiveFileInfo, activeFileContent } = useActiveFile();

  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [defaultScale, setDefaultScale] = useState<number>(0);
  const [isImageReady, setIsImageReady] = useState<boolean>(false);

  const [leftMousePressed, setLeftMousePressed] = useState<boolean>(null);
  const [currentScaleFactor, setCurrentScaleFactor] = useState<number>(1);

  const imageRef = useRef(null);
  const scrollableViewRef = useRef(null);
  const currentScaleFactorRef = useRef<number>(1);

  const getScrollableElement = () => {
    return scrollableViewRef.current;
  }

  const getImageElement = () => {
    return imageRef.current;
  }

  const scaleImage = useCallback((newScale?: number, zoomAnchor?: ZoomAnchor) => {
    const image = getImageElement();
    const container = getScrollableElement();

    if (!image || !container) return;

    const scrollablAreaStyle = getComputedStyle(container);
    const area = { x: parseInt(scrollablAreaStyle.width), y: parseInt(scrollablAreaStyle.height) };
    const anchorX = Math.min(Math.max(zoomAnchor?.x ?? area.x * 0.5, 0), area.x);
    const anchorY = Math.min(Math.max(zoomAnchor?.y ?? area.y * 0.5, 0), area.y);
    const prevScrollWidth = container.scrollWidth;
    const prevScrollHeight = container.scrollHeight;
    const anchorContentX = container.scrollLeft + anchorX;
    const anchorContentY = container.scrollTop + anchorY;

    const currentScale = currentScaleFactorRef.current;
    let nextScaleFactor = currentScale + currentScale * (newScale / 5);

    // Limit scale factor
    if (nextScaleFactor < minScale) {
      nextScaleFactor = minScale;
    } else if (nextScaleFactor > maxScale) {
      nextScaleFactor = maxScale;
    }

    if (newScale === 0) {
      nextScaleFactor = 1;
      setImageSize(image.naturalWidth * defaultScale, image.naturalHeight * defaultScale);
      centerImageElement();
    } else {
      const nextScale = defaultScale * nextScaleFactor;
      const newWidth = image.naturalWidth * nextScale;
      const newHeight = image.naturalHeight * nextScale;

      setImageSize(newWidth, newHeight);

      const widthRatio = prevScrollWidth > 0 ? container.scrollWidth / prevScrollWidth : 1;
      const heightRatio = prevScrollHeight > 0 ? container.scrollHeight / prevScrollHeight : 1;
      const nextScrollLeft = anchorContentX * widthRatio - anchorX;
      const nextScrollTop = anchorContentY * heightRatio - anchorY;

      container.scrollLeft = Math.min(Math.max(nextScrollLeft, 0), Math.max(container.scrollWidth - area.x, 0));
      container.scrollTop = Math.min(Math.max(nextScrollTop, 0), Math.max(container.scrollHeight - area.y, 0));
    }

    currentScaleFactorRef.current = nextScaleFactor;
    setCurrentScaleFactor(nextScaleFactor);
  }, [defaultScale]);

  const loadNextImage = () => {
    const allFiles = getNeighborFileList(activeFileInfo.fileInfoFromRemoteStorage);
    const currentFileIndex = allFiles.findIndex(e => e.id === activeFileInfo.fileInfoFromRemoteStorage.id);

    for (let i = currentFileIndex + 1; i < allFiles.length; i++) {
      if (allFiles[i].mimeType.includes('image')) {
        loadFileFromRS(allFiles[i]);
        return;
      }
    }
  }

  const loadPrevImage = () => {
    const allFiles = getNeighborFileList(activeFileInfo.fileInfoFromRemoteStorage);
    const currentFileIndex = allFiles.findIndex(e => e.id === activeFileInfo.fileInfoFromRemoteStorage.id);

    for (let i = currentFileIndex - 1; i >= 0; i--) {
      if (allFiles[i].mimeType.includes('image')) {
        loadFileFromRS(allFiles[i]);
        return;
      }
    }
  }

  useHotkey('viewer', keyCodes.ArrowLeft, (e) => { e.preventDefault(); loadPrevImage(); }, 'Previous image');
  useHotkey('viewer', keyCodes.ArrowRight, (e) => { e.preventDefault(); loadNextImage(); }, 'Next image');
  useHotkey('viewer', keyCodes.ArrowUp, (e) => { e.preventDefault(); scaleImage(+1); }, 'Zoom in');
  useHotkey('viewer', keyCodes.ArrowDown, (e) => { e.preventDefault(); scaleImage(-1); }, 'Zoom out');

  const centerImageElement = () => {
    getImageElement().scrollIntoView({ block: 'center', inline: 'center' });
  }

  const setDefaultScaleImmediately = () => {
    const containerSize = getScrollableElement()?.getBoundingClientRect();
    const { naturalWidth, naturalHeight } = getImageElement() || {};

    if (!containerSize || !naturalWidth || !naturalHeight) return;

    // Only scale down - if image is smaller than container, use scale 1.0
    const calculatedScale = Math.min(
      containerSize.width / naturalWidth,
      containerSize.height / naturalHeight
    );

    setDefaultScale(Math.min(calculatedScale, 1.0));

    centerImageElement();
  }

  const keepImageInCenterFor = (miliseconds: number) => {
    if (miliseconds <= 0) return;

    setDefaultScaleImmediately();
    const currentTime = new Date().getMilliseconds();

    requestAnimationFrame(() => {
      const deltaTime = new Date().getMilliseconds() - currentTime;

      if (deltaTime < 0) return;

      keepImageInCenterFor(miliseconds - deltaTime);
    });
  }

  const setDefaultScaleDebounced = useDebouncedCallback(() => {
    setDefaultScaleImmediately();
  }, 100);

  const setImageSize = (width, height) => {
    const containerSize = getScrollableElement().getBoundingClientRect();
    const maxWidth = Math.max(containerSize.width, width);
    const maxHeight = Math.max(containerSize.height, height);

    getImageElement().style.width = `${width}px`;
    getImageElement().style.height = `${height}px`;
    getImageElement().style.padding = `${maxHeight * 0.5}px ${maxWidth * 0.5}px`;
  }

  ////////////////////////////////////
  // Update image only if user opens file from explorer
  ////////////////////////////////////
  const buildCurrentImage = () => {
    setImageLoaded(false);
    setIsImageReady(false);

    const uint8Array = binaryStringToUint8Array(activeFileContent);
    const blob = new Blob([uint8Array], { type: activeFileInfo.fileInfoFromRemoteStorage?.mimeType || MimeTypesEnum.Png });
    const url = URL.createObjectURL(blob);

    getImageElement().src = url;
    getImageElement().onload = () => setImageLoaded(true);
  }

  // Update the on-image-load effect
  useEffect(() => {
    if (imageLoaded) {
      setDefaultScaleImmediately();
      setIsImageReady(true); // Show image after scaling
    }
  }, [imageLoaded]);

  useEffect(() => {
    (async () => {
      if (!activeFileInfo.isFileDownloadingFromRemoteStorage && activeFileInfo.changeFileInView) {
        log.appEvent("ImageViewer: File loaded. File name:", activeFileInfo.fileInfoFromRemoteStorage?.name);
        buildCurrentImage();
        setActiveFileInfo({ changeFileInView: false });
      }
    })()
  }, [activeFileInfo, setActiveFileInfo]);

  //////////////////////////
  // Set default scale parameter (on resize)
  //////////////////////////
  useEffect(() => {
    window.addEventListener('resize', setDefaultScaleDebounced);

    return () => {
      window.removeEventListener('resize', setDefaultScaleDebounced);
    }
  }, [setDefaultScaleDebounced]);

  // On drawer toggle
  useEffect(() => {
    if (drawerState) {
      // Left drawer transition time 300ms
      keepImageInCenterFor(300);
    }
  }, [drawerState]);

  // Scale image on load and default scale was set
  useEffect(() => {
    if (defaultScale) {
      currentScaleFactorRef.current = 1;
      setCurrentScaleFactor(1);
      scaleImage(0);
    }
  }, [defaultScale]);

  ////////////////////////
  // Set cursor
  ////////////////////////
  useEffect(() => {
    if (leftMousePressed) {
      getScrollableElement().style.cursor = 'move';
      return;
    }

    getScrollableElement().style.cursor = 'grab';
  }, [leftMousePressed]);

  //////////////////////////
  // Mouse wheel | scale image
  //////////////////////////
  useEffect(() => {
    const container = getScrollableElement();
    let touchpadZoomVelocity = 0;

    const isLikelyTouchpad = (event: WheelEvent) => {
      const absDeltaY = Math.abs(event.deltaY);

      return event.deltaMode === WheelEvent.DOM_DELTA_PIXEL
        && (absDeltaY < 40 || !Number.isInteger(absDeltaY));
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (isLikelyTouchpad(e)) {
        const touchpadZoomSensitivity = 0.04;
        const touchpadInertiaFactor = 0.7;
        const linearDelta = -e.deltaY * touchpadZoomSensitivity;

        touchpadZoomVelocity = touchpadZoomVelocity * touchpadInertiaFactor
          + linearDelta * (1 - touchpadInertiaFactor);

        const bounds = container.getBoundingClientRect();
        scaleImage(touchpadZoomVelocity, {
          x: e.clientX - bounds.left,
          y: e.clientY - bounds.top,
        });

        return;
      }

      const bounds = container.getBoundingClientRect();
      scaleImage((e.deltaY > 0 ? -1 : 1), {
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });
    }

    container.addEventListener('wheel', onWheel);

    return () => {
      container.removeEventListener('wheel', onWheel);
    }
  }, [scaleImage]);

  ///////////////////////////
  // Move image on mouse move (lmb pressed)
  ///////////////////////////
  useEffect(() => {
    const container = getScrollableElement();

    const onMouseMove = (e: MouseEvent) => {
      container.scrollLeft -= e.movementX;
      container.scrollTop -= e.movementY;
    }

    if (leftMousePressed) {
      window.addEventListener('mousemove', onMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    }
  }, [leftMousePressed]);

  //////////////////////////
  // Left mouse button pressed
  //////////////////////////
  useEffect(() => {
    const container = getScrollableElement();

    const onMousedown = () => setLeftMousePressed(true);
    const onMouseUp = () => setLeftMousePressed(false);

    container.addEventListener('mousedown', onMousedown);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      container.removeEventListener('mousedown', onMousedown);
      window.removeEventListener('mouseup', onMouseUp);
    }
  }, [setLeftMousePressed]);

  return (
    <div className="ImageViewer">
      <div className="ImageViewer__scaleButtons buttonGroup">
        <button
          title="Previous image"
          onClick={loadPrevImage}
          className="item-icon">
          <Icon>arrow_back</Icon>
        </button>

        <button
          title="Zoom out"
          onClick={() => scaleImage(-1)}
          className="item-icon">
          <Icon>remove</Icon>
        </button>

        <button
          title="Reset zoom"
          onClick={() => scaleImage(0)}
          className="item-icon">
          <Icon>crop_free</Icon>
        </button>

        <button
          title="Zoom in"
          onClick={() => scaleImage(+1)}
          className="item-icon">
          <Icon>add</Icon>
        </button>

        <button
          title="Next image"
          onClick={loadNextImage}
          className="item-icon">
          <Icon>arrow_forward</Icon>
        </button>
      </div>

      <div
        ref={scrollableViewRef}
        className="ImageViewer__scrollableArea">
        <Img
          ref={imageRef}
          alt={activeFileInfo?.fileInfoFromRemoteStorage?.name}
          draggable={false}
          className={`ImageViewer__image ${!isImageReady && 'inProgress'}`}
        />
      </div>
    </div>
  );
}

export default ImageViewer;
