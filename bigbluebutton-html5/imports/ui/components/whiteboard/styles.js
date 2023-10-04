import styled, { createGlobalStyle } from 'styled-components';
import { borderSize, borderSizeLarge } from '/imports/ui/stylesheets/styled-components/general';
import { toolbarButtonColor, colorWhite, colorBlack } from '/imports/ui/stylesheets/styled-components/palette';
import {
  fontSizeLarger,
} from '/imports/ui/stylesheets/styled-components/typography';
import Button from '/imports/ui/components/common/button/component';

const TldrawV2GlobalStyle = createGlobalStyle`
  ${({ isPresenter, hasWBAccess }) => (!isPresenter && hasWBAccess) && `
    [data-testid="tools.hand"] {
      display: none;
    }
  `}

  ${({ isMultiUser }) => !isMultiUser && `
    .tl-cursor use {
      href: "#newCursor";
      transform: scale(0.5) translate(-228px, -77px);
      transform-origin: center;
    }

    .tl-nametag {
      display: none;
    }
  `}

  ${({ isRTL }) => (!isRTL) && `
    .tlui-menu-zone {
      right: auto;
      left: 3.5rem;
    }
  `}

  ${({ isRTL }) => (isRTL) && `
    .tlui-menu-zone {
      right: 3.5rem;
      left: auto;
    }
  `}

  #presentationInnerWrapper > div:last-child {
    position: relative;
    height: 100%;
  }

  #presentationInnerWrapper > div:last-child > * {
    position: relative; 
    height: 100%;
  }

  #presentationInnerWrapper > div:last-child .tl-overlays {
    left: 0px;
    bottom: 0px;
  }

  .tlui-navigation-zone,
  .tlui-help-menu,
  .tlui-debug-panel {
    display: none;
  }

  .tlui-style-panel__wrapper {
    right: 0px;
    top: -0.35rem;
    position: relative;
  }

  // Add the following lines to override height and width attributes for .tl-overlays__item
  .tl-overlays__item {
    height: auto !important;
    width: auto !important;
  }

  [data-testid="tools.laser"],
  [data-testid="tools.asset"],
  [data-testid="tools.frame"],
  .tlui-menu-zone__controls > :nth-child(1),
  .tlui-menu-zone__controls > :nth-child(2),
  .tlui-menu-zone__controls > :nth-child(3),
  .tlui-menu-zone__controls > :nth-child(4) {
    display: none;
  }
`;

const EditableWBWrapper = styled.div`
  &, & > :first-child {
    cursor: inherit !important;
  }
`;

export default {
  TldrawV2GlobalStyle,
  EditableWBWrapper,
};