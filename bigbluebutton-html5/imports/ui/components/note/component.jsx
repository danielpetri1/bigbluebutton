import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl } from 'react-intl';
import injectWbResizeEvent from '/imports/ui/components/presentation/resize-wrapper/component';
import NoteService from '/imports/ui/components/note/service';
import Styled from './styles';
import { PANELS, ACTIONS } from '../layout/enums';
import browserInfo from '/imports/utils/browserInfo';

import { makeCall } from '/imports/ui/services/api';

const intlMessages = defineMessages({
  hideNoteLabel: {
    id: 'app.note.hideNoteLabel',
    description: 'Label for hiding note button',
  },
  title: {
    id: 'app.note.title',
    description: 'Title for the shared notes',
  },
  tipLabel: {
    id: 'app.note.tipLabel',
    description: 'Label for tip on how to escape iframe',
  },
  convertAndUploadLabel: {
    id: 'app.note.convertAndUpload',
    description: 'Export shared notes as a PDF and upload to the main room',
  },
});

const convertAndUpload = () => connect_to_pad();

const propTypes = {
  isLocked: PropTypes.bool.isRequired,
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  isRTL: PropTypes.bool.isRequired,
};

const Note = ({
  isLocked,
  intl,
  isRTL,
  layoutContextDispatch,
  isResizing,
}) => {
  const [noteURL, setNoteURL] = useState();
  const { isChrome } = browserInfo;

  useEffect(() => {
    NoteService.getNoteId().then((response) => {
      setNoteURL(NoteService.buildNoteURL(response));
    });
  }, [isLocked, isRTL]);

  useEffect(() => () => NoteService.setLastRevs(), []);

  return (
    <Styled.Note data-test="note" isChrome={isChrome}>
      <Styled.Header>
        <Styled.Title data-test="noteTitle">
          <Styled.HideButton
            onClick={() => {
              layoutContextDispatch({
                type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN,
                value: false,
              });
              layoutContextDispatch({
                type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL,
                value: PANELS.NONE,
              });
            }}
            data-test="hideNoteLabel"
            aria-label={intl.formatMessage(intlMessages.hideNoteLabel)}
            label={intl.formatMessage(intlMessages.title)}
            icon={isRTL ? 'right_arrow' : 'left_arrow'}
          />
          <Styled.HideButton
            onClick={convertAndUpload}
            label={intl.formatMessage(intlMessages.convertAndUploadLabel)}
            icon={'upload'}
          />
        </Styled.Title>
      </Styled.Header>
      <Styled.IFrame
        title="etherpad"
        src={noteURL}
        aria-describedby="sharedNotesEscapeHint"
        style={{
          pointerEvents: isResizing ? 'none' : 'inherit',
        }}
      />
      <Styled.Hint id="sharedNotesEscapeHint" aria-hidden>
        {intl.formatMessage(intlMessages.tipLabel)}
      </Styled.Hint>
    </Styled.Note>
  );
};

Note.propTypes = propTypes;

function connect_to_pad(){
  // @ts-ignore
  api = require('etherpad-lite-client')
  etherpad = api.connect({
    apikey: '43e8b017852cfc393feef498c57e6ef9e882d139e0de058a226c0092973eb131',
    host: 'vmott40.in.tum.de/pad',
    port: 9001,
    ssl: true,
    rejectUnauthorized: false
  });

  var args = {
    groupID: 'g.yJPG7ywIW6zPEQla',
    padName: 'testpad',
    text: 'Hello world!',
  }

  etherpad.createGroupPad(args, function(error, data) {
    if(error) console.error('Error creating pad: ' + error.message)
    else console.log('New pad created: ' + data.padID)
  })
  

  makeCall('userActivitySign');
}

export default injectWbResizeEvent(injectIntl(Note));
