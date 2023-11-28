import { check } from 'meteor/check';
import { extractCredentials } from '/imports/api/common/server/helpers';
import Logger from '/imports/startup/server/logger';
import RedisPubSub from '/imports/startup/server/redis';

export default async function getNotesAsMarkdown({ padId }) {
  try {
    const REDIS_CONFIG = Meteor.settings.private.redis;
    const CHANNEL = REDIS_CONFIG.channels.toAkkaApps;
    const EVENT_NAME = 'PadCaptureMarkdownPubMsg';

    const { meetingId } = extractCredentials(this.userId);

    check(meetingId, String);
    check(padId, String);

    if (padId) {
      const payload = {
        meetingId,
        padId,
        filename: 'Markdown_Notes',
      };

      Logger.info(`Sending PadCaptureMarkdownPubMsg for meetingId=${meetingId} padId=${padId}`);
      return RedisPubSub.publishMeetingMessage(CHANNEL, EVENT_NAME, meetingId, payload);
    }

    Logger.info(`No notes available for capture in meetingId=${meetingId} padId=${padId}`);
    return null;
  } catch (err) {
    Logger.info('========================================');
    Logger.info(`getNotesAsMarkdown: padId=${padId}`);
    Logger.error(`Error in getNotesAsMarkdown: ${err}`);
    Logger.info('========================================');
    return null;
  }
}
