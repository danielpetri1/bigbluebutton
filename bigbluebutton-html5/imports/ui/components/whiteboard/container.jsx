import { withTracker } from 'meteor/react-meteor-data';
import PropTypes from 'prop-types';
import { ColorStyle, DashStyle, SizeStyle, TDShapeType } from '@tldraw/tldraw';
import React, { useState, useEffect, useContext } from 'react';
import SettingsService from '/imports/ui/services/settings';
import {
  getShapes,
  getCurrentPres,
  initDefaultPages,
  persistShape,
  removeShapes,
  isMultiUserActive,
  hasMultiUserAccess,
  changeCurrentSlide,
  notifyNotAllowedChange,
  notifyShapeNumberExceeded,
  toggleToolsAnimations,
} from './service';
import Whiteboard from './component';
import { UsersContext } from '../components-data/users-context/context';
import Auth from '/imports/ui/services/auth';
import PresentationToolbarService from '../presentation/presentation-toolbar/service';
import {
  layoutSelect,
  layoutDispatch,
} from '/imports/ui/components/layout/context';
import FullscreenService from '/imports/ui/components/common/fullscreen-button/service';
import deviceInfo from '/imports/utils/deviceInfo';
import Service from './cursors/service';

const ROLE_MODERATOR = Meteor.settings.public.user.role_moderator;
const WHITEBOARD_CONFIG = Meteor.settings.public.whiteboard;

const WhiteboardContainer = (props) => {
  // console.log("WhiteboardContainer rendered")
  const [localShapes, setLocalShapes] = useState(null);

  const usingUsersContext = useContext(UsersContext);
  const isRTL = layoutSelect((i) => i.isRTL);
  const width = layoutSelect((i) => i?.output?.presentation?.width);
  const height = layoutSelect((i) => i?.output?.presentation?.height);
  const sidebarNavigationWidth = layoutSelect(
    (i) => i?.output?.sidebarNavigation?.width
  );
  const { users } = usingUsersContext;
  const currentUser = users[Auth.meetingID][Auth.userID];
  const isPresenter = currentUser.presenter;
  const isModerator = currentUser.role === ROLE_MODERATOR;
  const { maxStickyNoteLength, maxNumberOfAnnotations } = WHITEBOARD_CONFIG;
  const fontFamily = WHITEBOARD_CONFIG.styles.text.family;
  const handleToggleFullScreen = (ref) =>
    FullscreenService.toggleFullScreen(ref);
  const layoutContextDispatch = layoutDispatch();

  const { whiteboardId,  curPageId, intl, isViewersAnnotationsLocked, shapes } = props;
  
  // const hasShapeAccess = (id) => {
  //   // const owner = shapes[id]?.userId;
  //   // const isBackgroundShape = id?.includes('slide-background');
  //   // const isPollsResult = shapes[id]?.name?.includes('poll-result');
  //   // const hasAccess = !isBackgroundShape && !isPollsResult || isPresenter
  //   //   && ((owner && owner === currentUser?.userId) || !owner || isPresenter || isModerator);
  //   // return hasAccess;
  //   return true;
  // };

  const hasShapeAccess = (id) => {
    const s = getShapes(whiteboardId, curPageId, intl, isViewersAnnotationsLocked);
    const owner = s[id]?.meta?.uid;
    const hasAccess = (owner && owner === currentUser?.userId) || !owner || isPresenter || isModerator;
    return hasAccess;
  };

  // set shapes as locked for those who aren't allowed to edit it
  // Object.entries(shapes).forEach(([shapeId, shape]) => {
  //   if (!shape.isLocked && !hasShapeAccess(shapeId)) {
  //     const modShape = shape;
  //     modShape.isLocked = true;
  //   }
  // });

  return (
    <Whiteboard
      {...{
        isPresenter,
        isModerator,
        currentUser,
        isRTL,
        width,
        height,
        maxStickyNoteLength,
        maxNumberOfAnnotations,
        fontFamily,
        hasShapeAccess,
        handleToggleFullScreen,
        sidebarNavigationWidth,
        layoutContextDispatch,
        getShapes,
      }}
      {...props}
      meetingId={Auth.meetingID}
      shapes={shapes}
    />
  );
};

export default withTracker(({
  whiteboardId,
  curPageId,
  intl,
  slidePosition,
  svgUri,
  podId,
  presentationId,
  darkTheme,
  isViewersAnnotationsLocked,
}) => {
  const shapes =  getShapes(whiteboardId, curPageId, intl, isViewersAnnotationsLocked);
  const curPres = getCurrentPres();
  const { isIphone } = deviceInfo;
  const assets = {};

  return {
    whiteboardId, curPageId, intl, isViewersAnnotationsLocked,
    initDefaultPages,
    persistShape,
    isMultiUserActive,
    hasMultiUserAccess,
    changeCurrentSlide,
    shapes,
    assets,
    curPres,
    removeShapes,
    zoomSlide: PresentationToolbarService.zoomSlide,
    skipToSlide: PresentationToolbarService.skipToSlide,
    nextSlide: PresentationToolbarService.nextSlide,
    previousSlide: PresentationToolbarService.previousSlide,
    numberOfSlides: PresentationToolbarService.getNumberOfSlides(podId, presentationId),
    notifyNotAllowedChange,
    notifyShapeNumberExceeded,
    darkTheme,
    whiteboardToolbarAutoHide: SettingsService?.application?.whiteboardToolbarAutoHide,
    animations: SettingsService?.application?.animations,
    toggleToolsAnimations,
    isIphone,
    publishCursorUpdate: Service.publishCursorUpdate,
    otherCursors: Service.getCurrentCursors(whiteboardId),
    getShapes,
  };
})(WhiteboardContainer);

WhiteboardContainer.propTypes = {
  // shapes: PropTypes.objectOf(PropTypes.shape).isRequired,
};