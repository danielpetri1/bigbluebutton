import * as React from "react";
import PropTypes from "prop-types";
import { Tldraw, track, useEditor } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import SlideCalcUtil, { HUNDRED_PERCENT, MAX_PERCENT } from "/imports/utils/slideCalcUtils";
// eslint-disable-next-line import/no-extraneous-dependencies
import Settings from "/imports/ui/services/settings";
import logger from "/imports/startup/client/logger";
import KEY_CODES from "/imports/utils/keyCodes";
import {
  presentationMenuHeight,
  styleMenuOffset,
  styleMenuOffsetSmall,
} from "/imports/ui/stylesheets/styled-components/general";
import Styled from "./styles";
import {
  findRemoved,
  filterInvalidShapes,
  mapLanguage,
  sendShapeChanges,
  usePrevious,
} from "./utils";
// import { throttle } from "/imports/utils/throttle";
import { isEqual, clone } from "radash";
import { InstancePresenceRecordType } from "@tldraw/tldraw";
import {
  AssetRecordType,
  createShapeId,
  TLAsset,
  TLExternalAssetContent,
  getHashForString,
  DefaultColorStyle,
} from "@tldraw/tldraw";
import { PageRecordType } from "@tldraw/editor";
import { useRef } from "react";
import { debounce, throttle } from "radash";

const SMALL_HEIGHT = 435;
const SMALLEST_DOCK_HEIGHT = 475;
const SMALL_WIDTH = 800;
const SMALLEST_DOCK_WIDTH = 710;
const TOOLBAR_SMALL = 28;
const TOOLBAR_LARGE = 32;
const MOUNTED_RESIZE_DELAY = 1500;

// Shallow cloning with nested structures
const deepCloneUsingShallow = (obj) => {
  const clonedObj = clone(obj);
  if (obj.props) {
    clonedObj.props = clone(obj.props);
  }
  if (obj.props) {
    clonedObj.meta = clone(obj.meta);
  }
  return clonedObj;
};

// Helper functions
const updateSvgCursor = () => {
  const svgUseElement = document.querySelector('.tl-cursor use');
  if (svgUseElement) {
    svgUseElement.setAttribute('href', '#newCursor');
  }
};

const deleteProps = (obj, props) => {
  props.forEach(prop => delete obj[prop]);
}

const calculateDifferences = (prevStyles, nextStyles) => {
  const differences = {};
  for (let key in nextStyles) {
      if (nextStyles.hasOwnProperty(key) && prevStyles.hasOwnProperty(key) && key !== 'h' && key !== 'w') {
          if (nextStyles[key] !== prevStyles[key]) {
              differences[key] = nextStyles[key];
          }
      } else if (!prevStyles.hasOwnProperty(key)) {
          differences[key] = nextStyles[key];
      }
  }
  return differences;
}

const getBackgroundShapesAndAssets = (curPres, slidePosition) => {
  const bgAssets = [];
  const bgShapes = [];

  curPres?.pages?.forEach((entry) => {
    const assetId = AssetRecordType.createId(entry?.id);
    bgAssets.push({
      id: assetId,
      typeName: "asset",
      type: "image",
      props: {
        w: 1,
        h: 1,
        src: entry?.svgUri,
        name: "",
        isAnimated: false,
        mimeType: null,
      },
      meta: {},
    });

    bgShapes.push({
      x: 1,
      y: 1,
      rotation: 0,
      isLocked: true,
      opacity: 1,
      meta: {},
      id: `shape:${entry?.id}`,
      type: "image",
      props: {
        w: slidePosition?.width || 1,
        h: slidePosition?.height || 1,
        assetId: assetId,
        playing: true,
        url: "",
        crop: null,
      },
      parentId: `page:${entry?.num}`,
      index: "a0",
      typeName: "shape",
    });
  });

  return { bgAssets, bgShapes };
};

export default function Whiteboard(props) {
  const {
    isPresenter,
    removeShapes,
    initDefaultPages,
    persistShape,
    shapes,
    assets,
    currentUser,
    curPres,
    whiteboardId,
    podId,
    zoomSlide,
    skipToSlide,
    slidePosition,
    curPageId,
    presentationWidth,
    presentationHeight,
    isViewersCursorLocked,
    zoomChanger,
    isMultiUserActive,
    isRTL,
    fitToWidth,
    zoomValue,
    intl,
    svgUri,
    maxStickyNoteLength,
    fontFamily,
    hasShapeAccess,
    presentationAreaHeight,
    presentationAreaWidth,
    maxNumberOfAnnotations,
    notifyShapeNumberExceeded,
    darkTheme,
    setTldrawIsMounting,
    width,
    height,
    hasMultiUserAccess,
    tldrawAPI,
    setTldrawAPI,
    whiteboardToolbarAutoHide,
    toggleToolsAnimations,
    isIphone,
    sidebarNavigationWidth,
    animations,
    isToolbarVisible,
    isModerator,
    publishCursorUpdate,
    otherCursors,
    isShapeOwner,
    ShapeStylesContext,
  } = props;

  const isMultiUser = isMultiUserActive(whiteboardId);

  if (curPageId === "0" || !curPageId) return null;

  const [tlEditor, setTlEditor] = React.useState(null);
  const [cursorX, setCursorX] = React.useState(-1);
  const [cursorY, setCursorY] = React.useState(-1);
  const { currentShapeStyles, setCurrentShapeStyles } = React.useContext(ShapeStylesContext);

  const [zoom, setZoom] = React.useState(HUNDRED_PERCENT);
  const [tldrawZoom, setTldrawZoom] = React.useState(1);
  const [isMounting, setIsMounting] = React.useState(true);

  const prevShapes = usePrevious(shapes);
  const prevSlidePosition = usePrevious(slidePosition);
  const prevFitToWidth = usePrevious(fitToWidth);

  const whiteboardRef = React.useRef(null);
  const zoomValueRef = React.useRef(zoomValue);
  const prevShapesRef = React.useRef(shapes);
  const tlEditorRef = React.useRef(tlEditor);
  const isCanvasPos = React.useRef(false);
  const currentShapeStylesRef = React.useRef(currentShapeStyles);


  React.useEffect(() => {
    const handleMouseLeave = () => {
      setTimeout(() => {
        publishCursorUpdate({
          xPercent: -1,
          yPercent: -1,
          whiteboardId,
        });
      }, 150);
    };

    const handleMouseDown = () => {
      isCanvasPos.current = true;
    };

    const whiteboardElement = whiteboardRef.current;
    if (whiteboardElement) {
      whiteboardElement.addEventListener("mouseleave", handleMouseLeave);
      whiteboardElement.addEventListener("mousedown", handleMouseDown);
    }

    return () => {
      if (whiteboardElement) {
        whiteboardElement.removeEventListener("mouseleave", handleMouseLeave);
        whiteboardElement.addEventListener("mousedown", handleMouseDown);
      }
    };
  }, [whiteboardRef.current, curPageId]);

  React.useEffect(() => {
    currentShapeStylesRef.current = currentShapeStyles;
  }, [currentShapeStyles]);

  const language = React.useMemo(() => {
    return mapLanguage(Settings?.application?.locale?.toLowerCase() || "en");
  }, [Settings?.application?.locale]);

  React.useEffect(() => {
    tlEditorRef.current = tlEditor;
  }, [tlEditor]);

  React.useEffect(() => {
    isCanvasPos.current = false;
  }, [presentationHeight, presentationWidth, curPageId]);

  React.useEffect(() => {
    zoomValueRef.current = zoomValue;
  }, [zoomValue]);

  React.useEffect(() => {
    //TODO: figure out why shapes effect is happening without shape updates
    if (isEqual(prevShapesRef.current, shapes)) {
      return;
    }

    // Update the ref to store the current value of shapes
    prevShapesRef.current = shapes;

    const localShapes = tlEditor?.store?.allRecords();
    const filteredShapes =
      localShapes?.filter(
        (item) => item.typeName === "shape" && item?.index !== "a0"
      ) || [];
    const localLookup = new Map(
      filteredShapes.map((shape) => [shape.id, shape])
    );
    const remoteShapeIds = Object.keys(shapes);
    const shapesToAdd = [];
    const shapesToUpdate = [];
    const shapesToRemove = [];

    filteredShapes.forEach((localShape) => {
      // If a local shape does not exist in the remote shapes, it should be removed
      if (!remoteShapeIds.includes(localShape.id)) {
        shapesToRemove.push(localShape);
      }
    });

    Object.values(shapes).forEach((remoteShape) => {
      const localShape = localLookup.get(remoteShape.id);

      // Create a deep clone of remoteShape and remove the isModerator property
      const comparisonRemoteShape = deepCloneUsingShallow(remoteShape);
      delete comparisonRemoteShape.isModerator;

      if (!localShape) {
        // If the shape does not exist in local, add it to shapesToAdd
        shapesToAdd.push(remoteShape);
      } else if (!isEqual(localShape, comparisonRemoteShape)) {
        // Capture the differences
        const diff = {
          id: remoteShape.id,
          type: remoteShape.type,
          typeName: remoteShape.typeName,
        };

        // Compare each property
        Object.keys(remoteShape).forEach((key) => {
          if (
            key !== "isModerator" &&
            !isEqual(remoteShape[key], localShape[key])
          ) {
            diff[key] = remoteShape[key];
          }
        });

        if (remoteShape.props) {
          Object.keys(remoteShape.props).forEach((key) => {
            if (!isEqual(remoteShape.props[key], localShape.props[key])) {
              diff.props = diff.props || {};
              diff.props[key] = remoteShape.props[key];
            }
          });
        }

        shapesToUpdate.push(diff);
      }
    });

    tlEditor?.store?.mergeRemoteChanges(() => {
      // Now, handle the shapesToRemove if needed
      if (shapesToRemove.length > 0) {
        tlEditor?.store?.remove(shapesToRemove.map((shape) => shape.id));
      }
      if (shapesToAdd && shapesToAdd.length) {
        // Remove isModerator property from each shape in shapesToAdd
        shapesToAdd.forEach((shape) => {
          delete shape.isModerator;
        });
        tlEditor?.store?.put(shapesToAdd);
      }
      if (shapesToUpdate && shapesToUpdate.length) {
        tlEditor?.updateShapes(shapesToUpdate);
      }
    });
  }, [shapes, curPageId]);

  // Updating presences in tldraw store based on changes in cursors
  React.useEffect(() => {
    if (tlEditor) {
      const updatedPresences = otherCursors
        .map(({ userId, userName, xPercent, yPercent, presenter }) => {
          const id = InstancePresenceRecordType.createId(userId);
          const active = yPercent !== -1 && yPercent !== -1;
          // if cursor is not active remove it from tldraw store
          if (!active) {
            tlEditor.store.remove([id]);
            return null;
          }
          const currentPageId = tlEditor.currentPageId;
          const cursor = {
            x: xPercent,
            y: yPercent,
            type: "default",
            rotation: 0,
          };
          const color = presenter ? "#FF0000" : "#70DB70";
          const c = {
            ...InstancePresenceRecordType.create({
              id,
              currentPageId,
              userId,
              userName,
              cursor,
              color,
            }),
            lastActivityTimestamp: Date.now(),
          };
          return c;
        })
        .filter((cursor) => cursor && cursor.userId !== currentUser?.userId);

      // If there are any updated presences, put them all in the store
      if (updatedPresences.length) {
        setTimeout(() => {
          tlEditor.store.put(updatedPresences);
        }, 0);
      }
    }
  }, [otherCursors]);

  // propogate user tldraw cursor position
  React.useEffect(() => {
    publishCursorUpdate({
      xPercent: cursorX,
      yPercent: cursorY,
      whiteboardId,
    });
  }, [cursorX, cursorY]);

  const hasWBAccess = hasMultiUserAccess(whiteboardId, currentUser.userId);

  // set current tldraw page when presentation id updates
  React.useEffect(() => {
    if (tlEditor && curPageId !== "0") {
      tlEditor?.setCurrentPage(`page:${curPageId}`);
      whiteboardToolbarAutoHide && toggleToolsAnimations('fade-in', 'fade-out', '0s', hasWBAccess || isPresenter);
    }
  }, [curPageId]);

  // need to update the slide position in tldraw (slidePosition)
  React.useEffect(() => {
    if (tlEditor && curPageId) {
      tlEditor?.updateAssets([
        {
          id: `asset:${whiteboardId}`,
          props: {
            w: slidePosition?.width,
            h: slidePosition?.height,
            name: "bg",
            isAnimated: false,
            mimeType: null,
            src: tlEditor.store?.get(`asset:${whiteboardId}`)?.props?.src,
          },
        },
      ]);
    }
  }, [slidePosition?.width, slidePosition?.height]);

  // when presentationSizes change, update tldraw camera
  React.useEffect(() => {
    if (
      curPageId &&
      slidePosition &&
      tlEditor &&
      presentationWidth > 0 &&
      presentationHeight > 0
    ) {
      if (prevFitToWidth !== null && fitToWidth !== prevFitToWidth) {
        const newZoom = calculateZoom(
          slidePosition.width,
          slidePosition.height
        );
        tlEditor?.setCamera({ x: 0, y: 0, z: newZoom });

        const viewedRegionH = SlideCalcUtil.calcViewedRegionHeight(
          tlEditor?.viewportPageBounds.height,
          slidePosition.height
        );
        setZoom(HUNDRED_PERCENT);
        zoomChanger(HUNDRED_PERCENT);
        zoomSlide(
          parseInt(curPageId, 10),
          podId,
          HUNDRED_PERCENT,
          viewedRegionH,
          0,
          0
        );
      } else {
        const currentAspectRatio =
          Math.round((presentationWidth / presentationHeight) * 100) / 100;
        const previousAspectRatio =
          Math.round(
            (slidePosition.viewBoxWidth / slidePosition.viewBoxHeight) * 100
          ) / 100;
        if (fitToWidth && currentAspectRatio !== previousAspectRatio) {
          // we need this to ensure tldraw updates the viewport size after re-mounting
          const newZoom = calculateZoom(
            slidePosition.viewBoxWidth,
            slidePosition.viewBoxHeight
          );
          tlEditor?.setCamera({
            x: slidePosition?.x,
            y: slidePosition?.y,
            z: newZoom,
          });
        } else {
          const newZoom = calculateZoom(
            slidePosition.viewBoxWidth,
            slidePosition.viewBoxHeight
          );
          tlEditor?.setCamera({
            x: slidePosition?.x,
            y: slidePosition?.y,
            z: newZoom,
          });
        }
      }
    }
  }, [
    presentationWidth,
    presentationHeight,
    curPageId,
    document?.documentElement?.dir,
  ]);

  React.useEffect(() => {
    if (isPresenter && slidePosition) {
      const currentZoom = calculateZoom(
        slidePosition?.viewBoxWidth,
        slidePosition?.viewBoxHeight
      );

      setTimeout(() => {
        tlEditor?.setCamera({
          x: slidePosition?.x,
          y: slidePosition?.y,
          z: currentZoom,
        });
      }, 50);
    }
  }, [slidePosition?.viewBoxWidth, slidePosition?.viewBoxHeight]);

  // update zoom according to toolbar
  React.useEffect(() => {

    const zoomValueInt = parseInt(zoomValueRef.current, 10);

    if (
      tlEditor &&
      isPresenter &&
      curPageId &&
      slidePosition
      // (zoom !== zoomValueRef.current && zoom !== 100)
    ) {
      const zoomFitSlide = calculateZoom(
        slidePosition.width,
        slidePosition.height
      );
      const zoomCamera =
        (zoomFitSlide * zoomValueInt) / HUNDRED_PERCENT;
      setTimeout(() => {
        tlEditor?.setCamera({
          x: tlEditor?.camera.x,
          y: tlEditor?.camera.x,
          z: zoomCamera,
        });

        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        })
      }, 0);
    }
  }, [zoomValueRef.current, zoomValue]);

  // eslint-disable-next-line arrow-body-style
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);


  React.useEffect(() => {
    if (whiteboardToolbarAutoHide) {
      toggleToolsAnimations("fade-in", "fade-out", animations ? "3s" : "0s", hasWBAccess || isPresenter);
    } else {
      toggleToolsAnimations("fade-out", "fade-in", animations ? ".3s" : "0s", hasWBAccess || isPresenter);
    }
  }, [whiteboardToolbarAutoHide]);

  const calculateZoom = (localWidth, localHeight) => {
    const calcedZoom = fitToWidth
      ? presentationWidth / localWidth
      : Math.min(
          presentationWidth / localWidth,
          presentationHeight / localHeight
        );

    return calcedZoom === 0 || calcedZoom === Infinity
      ? HUNDRED_PERCENT
      : calcedZoom;
  };

  React.useEffect(() => {
    setTldrawIsMounting(true);
  }, []);

  React.useEffect(() => {
    if (presentationWidth > 0 && presentationHeight > 0 && slidePosition) {
      const cameraZoom = tldrawAPI?.getPageState()?.camera?.zoom;
      const newzoom = calculateZoom(
        slidePosition.viewBoxWidth,
        slidePosition.viewBoxHeight
      );
      if (cameraZoom && cameraZoom === 1) {
        tldrawAPI?.setCamera([slidePosition.x, slidePosition.y], newzoom);
      } else if (isMounting) {
        setIsMounting(false);

        /// brings presentation toolbar back
        setTldrawIsMounting(false);
        const currentAspectRatio =
          Math.round((presentationWidth / presentationHeight) * 100) / 100;
        const previousAspectRatio =
          Math.round(
            (slidePosition.viewBoxWidth / slidePosition.viewBoxHeight) * 100
          ) / 100;
        // case where the presenter had fit-to-width enabled and he reloads the page
        if (!fitToWidth && currentAspectRatio !== previousAspectRatio) {
          // wee need this to ensure tldraw updates the viewport size after re-mounting
          setTimeout(() => {
            tldrawAPI?.setCamera(
              [slidePosition.x, slidePosition.y],
              newzoom,
              "zoomed"
            );
          }, 50);
        } else {
          tldrawAPI?.setCamera([slidePosition.x, slidePosition.y], newzoom);
        }
      }
    }
  }, [
    tldrawAPI?.getPageState()?.camera,
    presentationWidth,
    presentationHeight,
  ]);

  const shouldKeepShape = (id) => {
    if (isPresenter || (isModerator && hasWBAccess) || (hasWBAccess && hasShapeAccess(id))) {
        return true;
    }
    return false;
  }

  const shouldResetShape = (shapeId) => {
    if (isPresenter || (isModerator && hasWBAccess) || (hasWBAccess && hasShapeAccess(shapeId))) {
      return false;
    }
    return true;
  }

  const handleTldrawMount = (editor) => {
    setTlEditor(editor);

    editor?.user?.updateUserPreferences({ locale: language });

    !isMultiUser && updateSvgCursor();

    console.log('EDITOR : ', editor, editor.pointerDown)
    const debouncePersistShape = debounce({ delay: 50 }, persistShape);
    const { bgAssets, bgShapes } = getBackgroundShapesAndAssets(
      curPres,
      slidePosition
    );

    if (editor && curPres) {
      const pages = curPres.pages
        .map((entry) => ({
          meta: {},
          id: `page:${entry?.num}`,
          name: `Slide ${entry.num}`,
          index: `a1`,
          typeName: "page",
        }))
        .reverse();

      editor.store.mergeRemoteChanges(() => {
        editor.batch(() => {
          editor.store.put(pages);
          editor.deletePage(editor.currentPageId);
          editor.setCurrentPage(`page:${curPageId}`);
          editor.store.put(bgAssets);
          editor.createShapes(bgShapes);
          editor.history.clear();
        });
      });

      const remoteShapes = props.getShapes(
        whiteboardId,
        curPageId,
        intl,
        false
      );
      const localShapes = editor.store.allRecords();
      const filteredShapes =
        localShapes.filter((item) => item.typeName === "shape") || [];

      const localShapesObj = {};
      filteredShapes.forEach((shape) => {
        localShapesObj[shape.id] = shape;
      });

      const shapesToAdd = [];
      for (let id in remoteShapes) {
        if (
          !localShapesObj[id] ||
          JSON.stringify(remoteShapes[id]) !==
            JSON.stringify(localShapesObj[id])
        ) {
          shapesToAdd.push(remoteShapes[id]);
        }
      }

      editor.store.mergeRemoteChanges(() => {
        if (shapesToAdd && shapesToAdd.length) {
          shapesToAdd.forEach((shape) => {
            delete shape.isModerator;
          });
          editor.store.put(shapesToAdd);
        }
      });

      editor.store.onBeforeCreate = (record, source) => {
        !isMultiUser && updateSvgCursor();
        if (source === 'user') {
          if (record?.id?.includes('instance_presence')) return record;

          record.meta.uid = `${currentUser.userId}`;
          record.props = { ...record.props, ...currentShapeStylesRef.current };

          const commonPropsToDelete = ['dash', 'fill', 'labelColor', 'geo', 'text', 'isClosed'];
          switch (record.type) {
            case 'note':
              deleteProps(record.props, [...commonPropsToDelete, 'segments', 'isComplete']);
              record.props.text = "";
              break;
            case 'text':
              deleteProps(record.props, ['verticalAlign', 'segments', 'isComplete', ...commonPropsToDelete]);
              record.props.text = "";
              break;
            case 'geo':
              deleteProps(record.props, ['segments', 'isComplete', 'isClosed']);
              record.props.text = "";
              break;
            case 'draw':
              deleteProps(record.props, ['font', 'align', 'labelColor', 'verticalAlign', 'geo', 'text']);
              record.props.segments = [{
                "type": "free",
                "points": [
                    {
                        "x": 0,
                        "y": 0,
                        "z": 0.5
                    }
                ]
              }];
              break;
            default:
              delete record.props.align;
          }
        }

        return record;
      }

      editor.store.onBeforeChange = (prev, next, source) => {
        let differences = {};
        if (next.id === 'instance:instance') {
          const cleanedNextStyles = Object.fromEntries(
            Object.entries(next.stylesForNextShape).map(
              ([key, value]) => [key.replace('tldraw:', ''), value]
            )
          );
          const cleanedPrevStyles = Object.fromEntries(
            Object.entries(prev.stylesForNextShape).map(
              ([key, value]) => [key.replace('tldraw:', ''), value]
            )
          );
          differences = calculateDifferences(cleanedPrevStyles, cleanedNextStyles);
        } else if (prev.id.includes('shape:') && next.id.includes('shape:')) {
          differences = calculateDifferences(prev.props, next.props);
        }

        Object.keys(differences).length > 0 && setCurrentShapeStyles(prevStyles => {
          const updatedStyles = {
            ...prevStyles,
            ...differences,
          };
          return updatedStyles;
        });

        if (next?.typeName === "instance_page_state") {
          if (!isEqual(prev.selectedShapeIds, next.selectedShapeIds)) {
            // Filter the selectedShapeIds
            next.selectedShapeIds = next.selectedShapeIds.filter(shouldKeepShape); 
          }
          if (!isEqual(prev.hoveredShapeId, next.hoveredShapeId)) {
            // Check hoveredShapeId
            if (shouldResetShape(next.hoveredShapeId)) {
              next.hoveredShapeId = null;
            }
          }
          return next;
        }

        const camera = editor?.camera;
        const panned =
          next?.id?.includes("camera") &&
          (prev.x !== next.x || prev.y !== next.y);
        const zoomed = next?.id?.includes("camera") && prev.z !== next.z;
        if (panned) {
          if (zoomValueRef.current <= HUNDRED_PERCENT) return prev;
          // // limit bounds
          if (editor?.viewportPageBounds?.maxX > slidePosition?.width) {
            next.x += editor.viewportPageBounds.maxX - slidePosition.width;
          }
          if (editor?.viewportPageBounds?.maxY > slidePosition?.height) {
            next.y += editor.viewportPageBounds.maxY - slidePosition.height;
          }
          if (next.x > 0 || editor.viewportPageBounds.minX < 0) {
            next.x = 0;
          }
          if (next.y > 0 || editor.viewportPageBounds.minY < 0) {
            next.y = 0;
          }
        }

        const zoomFitSlide = calculateZoom(slidePosition.width, slidePosition.height);
        if (camera.z < zoomFitSlide) {
          camera.z = zoomFitSlide;
        }

        const zoomToolbar = Math.round(((HUNDRED_PERCENT * camera.z) / zoomFitSlide) * 100) / 100;
        // if (zoom !== zoomToolbar) {
        //   setZoom(zoomToolbar);
        //   if (isPresenter) zoomChanger(zoomToolbar);
        // }

        let viewedRegionW = SlideCalcUtil.calcViewedRegionWidth(
          editor?.viewportPageBounds.width, slidePosition.width,
        );
        let viewedRegionH = SlideCalcUtil.calcViewedRegionHeight(
          editor?.viewportPageBounds.height, slidePosition.height,
        );

        if (!fitToWidth && camera.z === zoomFitSlide) {
          viewedRegionW = HUNDRED_PERCENT;
          viewedRegionH = HUNDRED_PERCENT;
        }

        // zoomSlide(
        //   parseInt(curPageId, 10),
        //   podId,
        //   viewedRegionW,
        //   viewedRegionH,
        //   next.x,
        //   next.y,
        // );

        !isMultiUser && updateSvgCursor();
        return next;
      };

      editor.store.onAfterChange = (prev, next, source) => {
        if (next?.id?.includes("pointer")) {
          !isMultiUser && updateSvgCursor();

          if (!isCanvasPos.current) {
            const container = document.querySelector('.tl-container');
            if (container) {
              const activeEl = document.activeElement;
              container?.focus();
              activeEl?.focus();
            }
          }

          if (next?.x !== cursorX && (next?.x !== -1 && next?.y !== -1)) {
            setCursorX(next?.x);
          }
          if (next?.y !== cursorY && (next?.x !== -1 && next?.y !== -1)) {
            setCursorY(next?.y);
          }
        }

        if (next?.id?.includes("shape") && whiteboardId && source === 'user') {
          debouncePersistShape(next, whiteboardId, isModerator);
        }
    };

      editor.store.onAfterDelete = (record, source) => {
        if (source === 'user') {
          removeShapes([record.id], whiteboardId);
        }
      };
    }

    if (prevFitToWidth !== null && fitToWidth !== prevFitToWidth) {
      const newZoom = calculateZoom(slidePosition.width, slidePosition.height);
      editor?.setCamera({ x: 0, y: 0, z: newZoom });

      const viewedRegionH = SlideCalcUtil.calcViewedRegionHeight(
        tlEditor?.viewportPageBounds.height,
        slidePosition.height
      );

      setZoom(HUNDRED_PERCENT);
      zoomChanger(HUNDRED_PERCENT);
      zoomSlide(
        parseInt(curPageId, 10),
        podId,
        HUNDRED_PERCENT,
        viewedRegionH,
        0,
        0
      );
    } else {
      const currentAspectRatio =
        Math.round((presentationWidth / presentationHeight) * 100) / 100;
      const previousAspectRatio =
        Math.round(
          (slidePosition.viewBoxWidth / slidePosition.viewBoxHeight) * 100
        ) / 100;
      if (fitToWidth && currentAspectRatio !== previousAspectRatio) {
        // we need this to ensure tldraw updates the viewport size after re-mounting
        setTimeout(() => {
          const newZoom = calculateZoom(
            slidePosition.viewBoxWidth,
            slidePosition.viewBoxHeight
          );
          editor?.setCamera({
            x: slidePosition?.x,
            y: slidePosition?.y,
            z: newZoom,
          });
        }, 50);
      } else {
        const newZoom = calculateZoom(
          slidePosition.viewBoxWidth,
          slidePosition.viewBoxHeight
        );
        editor?.setCamera({
          x: slidePosition?.x,
          y: slidePosition?.y,
          z: newZoom,
        });
      }
    }
  };

  const handleMouseEnter = () => {
    whiteboardToolbarAutoHide && toggleToolsAnimations('fade-out', 'fade-in', animations ? '.3s' : '0s', hasWBAccess || isPresenter)
  };
  
  const handleMouseLeave = () => {
    whiteboardToolbarAutoHide && toggleToolsAnimations('fade-in', 'fade-out', animations ? '3s' : '0s', hasWBAccess || isPresenter);
  };

  const editableWB = (
    <Tldraw
      key={`editableWB-${hasWBAccess}-${isPresenter}-${isModerator}-${whiteboardToolbarAutoHide}-${curPageId}`}
      forceMobileModeLayout
      onMount={handleTldrawMount}
    />
  );

  const readOnlyWB = (
    <Tldraw
      key={`readOnlyWB-${hasWBAccess}-${isPresenter}-${isModerator}-${whiteboardToolbarAutoHide}-${curPageId}`}
      forceMobileModeLayout
      hideUi
      onMount={handleTldrawMount}
    />
  );

  return (
    <div
      ref={whiteboardRef}
      id={"whiteboard-element"}
      key={`animations=-${animations}-${hasWBAccess}-${isPresenter}-${isModerator}-${whiteboardToolbarAutoHide}-${language}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {hasWBAccess || isPresenter ? editableWB : readOnlyWB}
      <Styled.TldrawV2GlobalStyle {...{ hasWBAccess, isPresenter, isRTL, isMultiUser }} />
    </div>
  );
}

Whiteboard.propTypes = {
  isPresenter: PropTypes.bool.isRequired,
  isIphone: PropTypes.bool.isRequired,
  removeShapes: PropTypes.func.isRequired,
  initDefaultPages: PropTypes.func.isRequired,
  persistShape: PropTypes.func.isRequired,
  notifyNotAllowedChange: PropTypes.func.isRequired,
  shapes: PropTypes.objectOf(PropTypes.shape).isRequired,
  assets: PropTypes.objectOf(PropTypes.shape).isRequired,
  currentUser: PropTypes.shape({
    userId: PropTypes.string.isRequired,
  }).isRequired,
  curPres: PropTypes.shape({
    pages: PropTypes.arrayOf(PropTypes.shape({})),
    id: PropTypes.string.isRequired,
  }),
  whiteboardId: PropTypes.string,
  podId: PropTypes.string.isRequired,
  zoomSlide: PropTypes.func.isRequired,
  skipToSlide: PropTypes.func.isRequired,
  slidePosition: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    viewBoxWidth: PropTypes.number.isRequired,
    viewBoxHeight: PropTypes.number.isRequired,
  }),
  curPageId: PropTypes.string.isRequired,
  presentationWidth: PropTypes.number.isRequired,
  presentationHeight: PropTypes.number.isRequired,
  isViewersCursorLocked: PropTypes.bool.isRequired,
  zoomChanger: PropTypes.func.isRequired,
  isMultiUserActive: PropTypes.func.isRequired,
  isRTL: PropTypes.bool.isRequired,
  fitToWidth: PropTypes.bool.isRequired,
  zoomValue: PropTypes.number.isRequired,
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  svgUri: PropTypes.string,
  maxStickyNoteLength: PropTypes.number.isRequired,
  fontFamily: PropTypes.string.isRequired,
  hasShapeAccess: PropTypes.func.isRequired,
  presentationAreaHeight: PropTypes.number.isRequired,
  presentationAreaWidth: PropTypes.number.isRequired,
  maxNumberOfAnnotations: PropTypes.number.isRequired,
  notifyShapeNumberExceeded: PropTypes.func.isRequired,
  darkTheme: PropTypes.bool.isRequired,
  setTldrawIsMounting: PropTypes.func.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  hasMultiUserAccess: PropTypes.func.isRequired,
  fullscreenElementId: PropTypes.string.isRequired,
  isFullscreen: PropTypes.bool.isRequired,
  layoutContextDispatch: PropTypes.func.isRequired,
  fullscreenAction: PropTypes.string.isRequired,
  fullscreenRef: PropTypes.instanceOf(Element),
  handleToggleFullScreen: PropTypes.func.isRequired,
  nextSlide: PropTypes.func.isRequired,
  numberOfSlides: PropTypes.number.isRequired,
  previousSlide: PropTypes.func.isRequired,
  sidebarNavigationWidth: PropTypes.number,
};

Whiteboard.defaultProps = {
  curPres: undefined,
  fullscreenRef: undefined,
  slidePosition: undefined,
  svgUri: undefined,
  whiteboardId: undefined,
  sidebarNavigationWidth: 0,
};
