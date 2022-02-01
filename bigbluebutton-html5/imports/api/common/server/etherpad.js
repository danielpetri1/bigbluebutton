import axios from 'axios';
import sha1 from 'crypto-js/sha1';
import Logger from '/imports/startup/server/logger';
import createNote from '/imports/api/note/server/methods/createNote';
import createCaptions from '/imports/api/captions/server/methods/createCaptions';

const ETHERPAD = Meteor.settings.private.etherpad;
const APP = Meteor.settings.private.app;

const BASE_URL = `http://${ETHERPAD.host}:${ETHERPAD.port}/api/${ETHERPAD.version}`;
const BASE_SESSION_URL = `http://${ETHERPAD.host}:${ETHERPAD.bbbPadsPort}/p`
const HASH_SIZE = 36;

const createPadURL = padId => `${BASE_URL}/createPad?apikey=${ETHERPAD.apikey}&padID=${padId}`;

const getReadOnlyIdURL = padId => `${BASE_URL}/getReadOnlyID?apikey=${ETHERPAD.apikey}&padID=${padId}`;

const appendTextURL = (padId, text) => `${BASE_URL}/appendText?apikey=${ETHERPAD.apikey}&padID=${padId}&text=${encodeURIComponent(text)}`;

const getAppHost = () => APP.host;

const getNotePdf = (padId) => axios.get(`${BASE_SESSION_URL}/${padId}/export/pdf`, { responseType: 'json' } );

const getNoteHtml = (padId) => axios.get(`${BASE_URL}/getHTML?apikey=${ETHERPAD.apikey}&padID=${padId}`, { responseType: 'json' } );

const checkTokenURL = () => `${BASE_URL}/checkToken?apikey=${ETHERPAD.apikey}`;

const hashSHA1 = (str) => sha1(str).toString().substring(0, HASH_SIZE);

const checkServer = () => {
  return new Promise((resolve, reject) => {
    axios({
      method: 'get',
      url: checkTokenURL(),
      responseType: 'json',
    }).then((response) => {
      const { status } = response;
      if (status !== 200) return reject();
      const { message } = response.data;
      if (message !== 'ok') return reject();
      resolve();
    }).catch(() => reject());
  });
};

const initPads = (meetingId, html5InstanceId) => {
  checkServer().then(() => {
    createNote(meetingId, html5InstanceId);
    createCaptions(meetingId, html5InstanceId);
  }).catch(() => Logger.error(`Pads' server unreachable`));
};

const withInstaceId = (instanceId, id) => `[${instanceId}]${id}`;

export {
  hashSHA1,
  createPadURL,
  getReadOnlyIdURL,
  appendTextURL,
  getAppHost,
  getNotePdf,
  getNoteHtml,
  initPads,
  withInstaceId,
}
