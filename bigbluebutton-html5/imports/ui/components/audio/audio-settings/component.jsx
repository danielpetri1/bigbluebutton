import React from 'react';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl } from 'react-intl';
import Button from '/imports/ui/components/common/button/component';
import AudioTestContainer from '/imports/ui/components/audio/audio-test/container';
import Styled from './styles';
import logger from '/imports/startup/client/logger';
import AudioStreamVolume from '/imports/ui/components/audio/audio-stream-volume/component';
import LocalEchoContainer from '/imports/ui/components/audio/local-echo/container';
import DeviceSelector from '/imports/ui/components/audio/device-selector/component';
import MediaStreamUtils from '/imports/utils/media-stream-utils';
import AudioManager from '/imports/ui/services/audio-manager';
import Session from '/imports/ui/services/storage/in-memory';

const propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  animations: PropTypes.bool,
  changeInputDevice: PropTypes.func.isRequired,
  liveChangeInputDevice: PropTypes.func.isRequired,
  changeOutputDevice: PropTypes.func.isRequired,
  handleBack: PropTypes.func.isRequired,
  handleConfirmation: PropTypes.func.isRequired,
  handleGUMFailure: PropTypes.func.isRequired,
  isConnecting: PropTypes.bool.isRequired,
  isConnected: PropTypes.bool.isRequired,
  isMuted: PropTypes.bool.isRequired,
  toggleMuteMicrophoneSystem: PropTypes.func.isRequired,
  inputDeviceId: PropTypes.string.isRequired,
  outputDeviceId: PropTypes.string.isRequired,
  produceStreams: PropTypes.bool,
  withEcho: PropTypes.bool,
  withVolumeMeter: PropTypes.bool,
  notify: PropTypes.func.isRequired,
  unmuteOnExit: PropTypes.bool,
  doGUM: PropTypes.func.isRequired,
  getAudioConstraints: PropTypes.func.isRequired,
  checkMicrophonePermission: PropTypes.func.isRequired,
  supportsTransparentListenOnly: PropTypes.bool.isRequired,
  toggleVoice: PropTypes.func.isRequired,
  permissionStatus: PropTypes.string,
};

const defaultProps = {
  animations: true,
  produceStreams: false,
  withEcho: false,
  withVolumeMeter: false,
  unmuteOnExit: false,
  permissionStatus: null,
};

const intlMessages = defineMessages({
  backLabel: {
    id: 'app.audio.backLabel',
    description: 'audio settings back button label',
  },
  micSourceLabel: {
    id: 'app.audio.audioSettings.microphoneSourceLabel',
    description: 'Label for mic source',
  },
  speakerSourceLabel: {
    id: 'app.audio.audioSettings.speakerSourceLabel',
    description: 'Label for speaker source',
  },
  streamVolumeLabel: {
    id: 'app.audio.audioSettings.microphoneStreamLabel',
    description: 'Label for stream volume',
  },
  retryLabel: {
    id: 'app.audio.joinAudio',
    description: 'Confirmation button label',
  },
  deviceChangeFailed: {
    id: 'app.audioNotification.deviceChangeFailed',
    description: 'Device change failed',
  },
  confirmLabel: {
    id: 'app.audio.audioSettings.confirmLabel',
    description: 'Audio settings confirmation button label',
  },
  cancelLabel: {
    id: 'app.audio.audioSettings.cancelLabel',
    description: 'Audio settings cancel button label',
  },
  findingDevicesTitle: {
    id: 'app.audio.audioSettings.findingDevicesTitle',
    description: 'Message for finding audio devices',
  },
});

class AudioSettings extends React.Component {
  constructor(props) {
    super(props);

    const {
      inputDeviceId,
      outputDeviceId,
      unmuteOnExit,
    } = props;

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleOutputChange = this.handleOutputChange.bind(this);
    this.handleConfirmationClick = this.handleConfirmationClick.bind(this);
    this.handleCancelClick = this.handleCancelClick.bind(this);
    this.unmuteOnExit = this.unmuteOnExit.bind(this);
    this.updateDeviceList = this.updateDeviceList.bind(this);

    this.state = {
      inputDeviceId,
      outputDeviceId,
      // If streams need to be produced, device selectors and audio join are
      // blocked until at least one stream is generated
      producingStreams: props.produceStreams,
      stream: null,
      unmuteOnExit,
      audioInputDevices: [],
      audioOutputDevices: [],
      findingDevices: true,
    };

    this._isMounted = false;
  }

  componentDidMount() {
    const {
      inputDeviceId,
      outputDeviceId,
    } = this.state;
    const {
      isConnected,
      isMuted,
      toggleMuteMicrophoneSystem,
      checkMicrophonePermission,
      toggleVoice,
      permissionStatus,
    } = this.props;

    Session.setItem('inEchoTest', true);
    this._isMounted = true;
    // Guarantee initial in/out devices are initialized on all ends
    AudioManager.isEchoTest = true;
    checkMicrophonePermission({ gumOnPrompt: true, permissionStatus })
      .then(this.updateDeviceList)
      .then(() => {
        if (!this._isMounted) return;

        navigator.mediaDevices.addEventListener(
          'devicechange',
          this.updateDeviceList,
        );
        this.setState({ findingDevices: false });
        this.setInputDevice(inputDeviceId);
        this.setOutputDevice(outputDeviceId);
      });

    // If connected and unmuted, we need to mute the audio and revert it
    // back to the original state on exit.
    if (isConnected && !isMuted) {
      toggleMuteMicrophoneSystem(isMuted, toggleVoice);
      // We only need to revert the mute state if the user is not listen-only
      if (inputDeviceId !== 'listen-only') this.setState({ unmuteOnExit: true });
    }
  }

  componentDidUpdate(prevProps) {
    const { permissionStatus } = this.props;

    if (prevProps.permissionStatus !== permissionStatus) {
      this.updateDeviceList();
    }
  }

  componentWillUnmount() {
    const { stream } = this.state;

    Session.setItem('inEchoTest', false);
    this._isMounted = false;

    if (stream) {
      MediaStreamUtils.stopMediaStreamTracks(stream);
    }

    AudioManager.isEchoTest = false;
    navigator.mediaDevices.removeEventListener(
      'devicechange', this.updateDeviceList,
    );

    this.unmuteOnExit();
  }

  handleInputChange(deviceId) {
    this.setInputDevice(deviceId);
  }

  handleOutputChange(deviceId) {
    this.setOutputDevice(deviceId);
  }

  handleConfirmationClick() {
    const { stream, inputDeviceId } = this.state;
    const {
      isConnected,
      produceStreams,
      handleConfirmation,
      liveChangeInputDevice,
    } = this.props;

    // If connected, we need to use the in-call device change method so that all
    // components pick up the change and the peer is properly updated.
    if (isConnected) liveChangeInputDevice(inputDeviceId);

    // Stream generation disabled or there isn't any stream: just run the provided callback
    if (!produceStreams || !stream) return handleConfirmation();

    // Stream generation enabled and there is a valid input stream => call
    // the confirmation callback with the input stream as arg so it can be used
    // in upstream components. The rationale is no surplus gUM calls.
    // We're cloning it because the original will be cleaned up on unmount here.
    const clonedStream = stream.clone();
    return handleConfirmation(clonedStream);
  }

  handleCancelClick() {
    const { handleBack } = this.props;

    handleBack();
  }

  setInputDevice(deviceId) {
    const {
      isConnected,
      handleGUMFailure,
      changeInputDevice,
      produceStreams,
      intl,
      notify,
    } = this.props;
    const { inputDeviceId: currentInputDeviceId } = this.state;
    try {
      if (!isConnected) changeInputDevice(deviceId);

      // Only generate input streams if they're going to be used with something
      // In this case, the volume meter or local echo test.
      if (produceStreams) {
        this.generateInputStream(deviceId).then((stream) => {
          // Extract the deviceId again from the stream to guarantee consistency
          // between stream DID vs chosen DID. That's necessary in scenarios where,
          // eg, there's no default/pre-set deviceId ('') and the browser's
          // default device has been altered by the user (browser default != system's
          // default).
          let extractedDeviceId = deviceId;

          if (stream) {
            extractedDeviceId = MediaStreamUtils.extractDeviceIdFromStream(stream, 'audio');

            if (extractedDeviceId !== deviceId && !isConnected) {
              changeInputDevice(extractedDeviceId);
            }
          }

          // Component unmounted after gUM resolution -> skip echo rendering
          if (!this._isMounted) return;

          this.setState({
            inputDeviceId: extractedDeviceId,
            stream,
            producingStreams: false,
          });
        }).catch((error) => {
          logger.warn({
            logCode: 'audiosettings_gum_failed',
            extraInfo: {
              deviceId,
              errorMessage: error.message,
              errorName: error.name,
            },
          }, `Audio settings gUM failed: ${error.name}`);
          handleGUMFailure(error);
        });
      } else {
        this.setState({
          inputDeviceId: deviceId,
        });
      }
    } catch (error) {
      logger.debug(
        {
          logCode: 'audiosettings_input_device_change_failure',
          extraInfo: {
            errorName: error.name,
            errorMessage: error.message,
            deviceId: currentInputDeviceId,
            newDeviceId: deviceId,
          },
        },
        `Audio settings: error changing input device - {${error.name}: ${error.message}}`,
      );
      notify(intl.formatMessage(intlMessages.deviceChangeFailed), true);
    }
  }

  setOutputDevice(deviceId) {
    const { changeOutputDevice, withEcho, intl, notify } = this.props;
    const { outputDeviceId: currentOutputDeviceId } = this.state;

    // withEcho usage (isLive arg): if local echo is enabled we need the device
    // change to be performed seamlessly (which is what the isLive parameter guarantees)
    changeOutputDevice(deviceId, withEcho)
      .then(() => {
        this.setState({
          outputDeviceId: deviceId,
        });
      })
      .catch((error) => {
        logger.debug(
          {
            logCode: 'audiosettings_output_device_change_failure',
            extraInfo: {
              errorName: error.name,
              errorMessage: error.message,
              deviceId: currentOutputDeviceId,
              newDeviceId: deviceId,
            },
          },
          `Audio settings: error changing output device - {${error.name}: ${error.message}}`
        );
        notify(intl.formatMessage(intlMessages.deviceChangeFailed), true);
      });
  }

  updateDeviceList() {
    return navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        const audioInputDevices = devices.filter((i) => i.kind === 'audioinput');
        const audioOutputDevices = devices.filter((i) => i.kind === 'audiooutput');

        this.setState({
          audioInputDevices,
          audioOutputDevices,
        });
      });
  }

  unmuteOnExit() {
    const { toggleMuteMicrophoneSystem, toggleVoice } = this.props;
    const { unmuteOnExit } = this.state;

    // Unmutes microphone if flagged to do so
    if (unmuteOnExit) toggleMuteMicrophoneSystem(true, toggleVoice);
  }

  generateInputStream(inputDeviceId) {
    const { doGUM, getAudioConstraints } = this.props;
    const { stream } = this.state;

    if (inputDeviceId && stream) {
      const currentDeviceId = MediaStreamUtils.extractDeviceIdFromStream(stream, 'audio');

      if (currentDeviceId === inputDeviceId) return Promise.resolve(stream);

      MediaStreamUtils.stopMediaStreamTracks(stream);
    }

    if (inputDeviceId === 'listen-only') return Promise.resolve(null);

    const constraints = {
      audio: getAudioConstraints({ deviceId: inputDeviceId }),
    };

    return doGUM(constraints, true);
  }

  renderOutputTest() {
    const { withEcho, intl } = this.props;
    const { stream } = this.state;

    return (
      <Styled.Row>
        <Styled.SpacedLeftCol>
          <Styled.LabelSmall htmlFor="audioTest">
            {!withEcho ? (
              <AudioTestContainer id="audioTest" />
            ) : (
              <LocalEchoContainer intl={intl} stream={stream} />
            )}
          </Styled.LabelSmall>
        </Styled.SpacedLeftCol>
      </Styled.Row>
    );
  }

  renderVolumeMeter() {
    const { withVolumeMeter, intl } = this.props;
    const { stream } = this.state;

    return withVolumeMeter ? (
      <Styled.Row>
        <Styled.LabelSmallFullWidth htmlFor="audioStreamVolume">
          {intl.formatMessage(intlMessages.streamVolumeLabel)}
          <AudioStreamVolume stream={stream} />
        </Styled.LabelSmallFullWidth>
      </Styled.Row>
    ) : null;
  }

  renderDeviceSelectors() {
    const {
      inputDeviceId,
      outputDeviceId,
      producingStreams,
      audioInputDevices,
      audioOutputDevices,
      findingDevices,
    } = this.state;
    const { intl, isConnecting, supportsTransparentListenOnly } = this.props;
    const blocked = producingStreams || isConnecting || findingDevices;

    return (
      <Styled.Row>
        <Styled.Col>
          <Styled.FormElement>
            <Styled.LabelSmall htmlFor="inputDeviceSelector">
              {intl.formatMessage(intlMessages.micSourceLabel)}
              <DeviceSelector
                id="inputDeviceSelector"
                deviceId={inputDeviceId}
                devices={audioInputDevices}
                kind="audioinput"
                blocked={blocked}
                onChange={this.handleInputChange}
                intl={intl}
                supportsTransparentListenOnly={supportsTransparentListenOnly}
              />
            </Styled.LabelSmall>
          </Styled.FormElement>
        </Styled.Col>
        <Styled.Col>
          <Styled.FormElement>
            <Styled.LabelSmall htmlFor="outputDeviceSelector">
              {intl.formatMessage(intlMessages.speakerSourceLabel)}
              <DeviceSelector
                id="outputDeviceSelector"
                deviceId={outputDeviceId}
                devices={audioOutputDevices}
                kind="audiooutput"
                blocked={blocked}
                onChange={this.handleOutputChange}
                intl={intl}
                supportsTransparentListenOnly={supportsTransparentListenOnly}
              />
            </Styled.LabelSmall>
          </Styled.FormElement>
        </Styled.Col>
      </Styled.Row>
    );
  }

  render() {
    const {
      findingDevices,
      producingStreams,
    } = this.state;
    const {
      isConnecting,
      isConnected,
      intl,
      animations,
    } = this.props;

    return (
      <Styled.FormWrapper data-test="audioSettingsModal">
        <Styled.Form>
          {this.renderDeviceSelectors()}
          {this.renderOutputTest()}
          {this.renderVolumeMeter()}
        </Styled.Form>
        {findingDevices && (
          <Styled.AudioNote>
            <span>{intl.formatMessage(intlMessages.findingDevicesTitle)}</span>
            <Styled.FetchingAnimation animations={animations} />
          </Styled.AudioNote>
        )}
        <Styled.EnterAudio>
          <Styled.BackButton
            label={isConnected
              ? intl.formatMessage(intlMessages.cancelLabel)
              : intl.formatMessage(intlMessages.backLabel)}
            color="secondary"
            onClick={this.handleCancelClick}
            disabled={isConnecting}
          />
          <Button
            data-test="joinEchoTestButton"
            size="md"
            color="primary"
            label={isConnected
              ? intl.formatMessage(intlMessages.confirmLabel)
              : intl.formatMessage(intlMessages.retryLabel)}
            onClick={this.handleConfirmationClick}
            disabled={isConnecting || producingStreams}
          />
        </Styled.EnterAudio>
      </Styled.FormWrapper>
    );
  }
}

AudioSettings.propTypes = propTypes;
AudioSettings.defaultProps = defaultProps;

export default injectIntl(AudioSettings);
