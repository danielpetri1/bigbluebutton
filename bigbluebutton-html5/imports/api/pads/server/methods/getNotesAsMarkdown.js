import { check } from 'meteor/check';
import { extractCredentials } from '/imports/api/common/server/helpers';
import Logger from '/imports/startup/server/logger';
import RedisPubSub from '/imports/startup/server/redis';

export default async function getNotesAsMarkdown(padId) {
  try {
    const REDIS_CONFIG = Meteor.settings.private.redis;
    const CHANNEL = REDIS_CONFIG.channels.toAkkaApps;
    const EVENT_NAME = 'PadCaptureMarkdownPubMsg';

    const { meetingId } = extractCredentials(this.userId);
    const pad = padId?.padId;

    check(meetingId, String);
    check(pad, String);

    if (pad) {
      const payload = {
        meetingId,
        padId: pad,
        filename: 'Shared_Notes',
      };

      Logger.info(`Sending PadCaptureMarkdownPubMsg for meetingId=${meetingId} padId=${pad}`);
      return RedisPubSub.publishMeetingMessage(CHANNEL, EVENT_NAME, meetingId, payload);
    }

    Logger.info(`No notes available for capture in meetingId=${meetingId} padId=${padId?.padId}`);
    return null;
  } catch (err) {
    Logger.info('========================================');
    Logger.info(`getNotesAsMarkdown: padId=${padId?.padId}`);
    Logger.error(`Error in getNotesAsMarkdown: ${err}`);
    Logger.info('========================================');
    return null;
  }
}
