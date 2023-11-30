import { Meteor } from 'meteor/meteor';
import RedisPubSub from '/imports/startup/server/redis';
import Logger from '/imports/startup/server/logger';
import { extractCredentials } from '/imports/api/common/server/helpers';
import { check } from 'meteor/check';
import Pads from '/imports/api/pads';
import { HTTP } from 'meteor/http';

export default async function createBreakoutRoom(rooms, durationInMinutes, record = false, captureNotes = false, captureSlides = false, sendInviteToModerators = false, defaultNotesText = '') {
  const REDIS_CONFIG = Meteor.settings.private.redis;
  const CHANNEL = REDIS_CONFIG.channels.toAkkaApps;
  const BREAKOUT_LIM = Meteor.settings.public.app.breakouts.breakoutRoomLimit;
  const MIN_BREAKOUT_ROOMS = 2;
  const MAX_BREAKOUT_ROOMS = BREAKOUT_LIM > MIN_BREAKOUT_ROOMS ? BREAKOUT_LIM : MIN_BREAKOUT_ROOMS;
  const EVENT_NAME = 'CreateBreakoutRoomsCmdMsg';

  try {
    const { meetingId, requesterUserId } = extractCredentials(this.userId);

    check(meetingId, String);
    check(requesterUserId, String);

    if (rooms.length > MAX_BREAKOUT_ROOMS) {
      Logger.info(`Attempt to create breakout rooms with invalid number of rooms in meeting id=${meetingId}`);
      return;
    }

    const pad = await Pads.findOneAsync(
      {
        meetingId,
        externalId: 'notes',
      },
      {
        fields: {
          padId: 1,
        },
      },
    );

    if (pad && pad.padId) {
      const { padId } = pad;
      const url = `http://127.0.0.1:9002/p/${padId}/export/txt`;

      const response = HTTP.call('GET', url);
      defaultNotesText = response.content;
    }

    const payload = {
      record,
      captureNotes,
      captureSlides,
      durationInMinutes,
      rooms,
      meetingId,
      sendInviteToModerators,
      defaultNotesText,
    };

    RedisPubSub.publishUserMessage(CHANNEL, EVENT_NAME, meetingId, requesterUserId, payload);
  } catch (err) {
    Logger.error(`Exception while invoking method createBreakoutRoom ${err.stack}`);
  }
}
