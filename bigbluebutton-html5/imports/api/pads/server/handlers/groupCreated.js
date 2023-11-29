import createGroup from '/imports/api/pads/server/modifiers/createGroup';
import Logger from '/imports/startup/server/logger';

export default async function groupCreated({ header, body }) {
  const {
    meetingId,
    userId,
  } = header;

  const {
    externalId,
    model,
    name,
    defaultText,
  } = body;

  Logger.info('============================');
  Logger.info('FROM bbb-pads');
  Logger.info('defaultText is', defaultText);
  Logger.info('============================');

  await createGroup(meetingId, userId, externalId, model, name, defaultText);
}
