import { Meteor } from 'meteor/meteor';
import RedisPubSub from '/imports/startup/server/redis';
import { extractCredentials } from '/imports/api/common/server/helpers';
import { check } from 'meteor/check';
import Logger from '/imports/startup/server/logger';

export default function breakoutRoomSnapshot(breakoutId, shortName) {
  const REDIS_CONFIG = Meteor.settings.private.redis;
  const CHANNEL = REDIS_CONFIG.channels.toAkkaApps;
  const EVENT_NAME = 'BreakoutSnapshotReqMsg';

  try {
    const { meetingId, requesterUserId } = extractCredentials(this.userId);

    check(breakoutId, String);
    check(shortName, String);
    check(meetingId, String);
    check(requesterUserId, String);

    RedisPubSub.publishUserMessage(
      CHANNEL, EVENT_NAME, breakoutId, requesterUserId,
      {
        parentMeetingId: meetingId,
        shortName,
      },
    );
  } catch (err) {
    Logger.error(`Exception while invoking method breakoutRoomSnapshot ${err.stack}`);
  }
}
