import { useExplorer } from "reactHooks/fileManager/explorer/explorer.hook";
import { useActiveFile } from "reactHooks/fileManager/activeFile/activeFile.hook";
import { useCallback, useEffect, useRef, useState } from "react";

import { log } from "services/log/log.service";
import { useFileViewerService } from "services/FileViewer/fileViewer.service";

import { useRecoilState } from "recoil";
import { leftDrawerSelector } from "state/localState/leftDrawerState";

import { Img } from "components/Atoms/Img/Img";
import { Icon } from "components/Atoms/Icon/Icon";
import { MimeTypesEnum } from "const/mimeTypes/mimeTypes.const";
import { useDebouncedCallback } from "use-debounce";

import './ImageViewer.css';
import { keyCodes } from "services/keyboardEvents/keyCodes.const";

type Props = {};

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
  const [lastScrollPosition, setlastScrollPosition] = useState({ x: 0.5, y: 0.5 }); // 0...1 is percentages in scrollable container area

  const imageRef = useRef(null);
  const scrollableViewRef = useRef(null);

  const getScrollableElement = () => {
    return scrollableViewRef.current;
  }

  const getImageElement = () => {
    return imageRef.current;
  }

  const scaleImage = useCallback((newScale?: number) => {
    const image = getImageElement();
    const container = getScrollableElement();
    const scrollablAreaStyle = getComputedStyle(container);
    const area = { x: parseInt(scrollablAreaStyle.width), y: parseInt(scrollablAreaStyle.height) };

    let nextScaleFactor = currentScaleFactor + currentScaleFactor * (newScale / 5);

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

      const maxScrollLeft = container.scrollWidth - area.x;
      const maxScrollTop = container.scrollHeight - area.y;

      container.scrollTop = maxScrollTop * lastScrollPosition.y;
      container.scrollLeft = maxScrollLeft * lastScrollPosition.x;
    }

    setCurrentScaleFactor(nextScaleFactor);
  }, [lastScrollPosition, currentScaleFactor, defaultScale]);

  const onKeydown = useCallback((e: KeyboardEvent) => {
    if (e.code === keyCodes.ArrowLeft) {
      e.preventDefault();
      loadPrevImage();
      return;
    }

    if (e.code === keyCodes.ArrowRight) {
      e.preventDefault();
      loadNextImage();
      return;
    }

    if (e.code === keyCodes.ArrowUp) {
      e.preventDefault();
      scaleImage(+1);
      return;
    }

    if (e.code === keyCodes.ArrowDown) {
      e.preventDefault();
      scaleImage(-1);
      return;
    }
  }, [scaleImage]);

  useEffect(() => {
    window.addEventListener('keydown', onKeydown);

    return () => {
      window.removeEventListener('keydown', onKeydown);
    }
  }, [onKeydown]);

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

  const saveLastScrollPosition = useDebouncedCallback(() => {
    const container = getScrollableElement();
    const scrollablAreaStyle = getComputedStyle(container);
    const area = { x: parseInt(scrollablAreaStyle.width), y: parseInt(scrollablAreaStyle.height) };
    const scrollTop = container.scrollTop / (container.scrollHeight - area.y);
    const scrollLeft = container.scrollLeft / (container.scrollWidth - area.x);
    setlastScrollPosition({ x: scrollLeft, y: scrollTop });
  }, 25);

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

  useEffect(() => {
    if (!getScrollableElement() || !saveLastScrollPosition) return;

    getScrollableElement()?.addEventListener('scroll', saveLastScrollPosition);

    return () => {
      getScrollableElement()?.removeEventListener('scroll', saveLastScrollPosition);
    }
  }, [saveLastScrollPosition])

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

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      scaleImage((e.deltaY > 0 ? -1 : 1));
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
