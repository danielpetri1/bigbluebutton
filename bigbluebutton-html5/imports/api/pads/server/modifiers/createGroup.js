import { check } from 'meteor/check';
import Pads from '/imports/api/pads';
import Logger from '/imports/startup/server/logger';
import createPad from '/imports/api/pads/server/methods/createPad';

export default async function createGroup(meetingId, userId, externalId, model, name, defaultText) {
  try {
    check(meetingId, String);
    check(userId, String);
    check(externalId, String);
    check(model, String);
    check(name, String);
    check(defaultText, String);

    Logger.info('============================');
    Logger.info('defaultText is', defaultText);
    Logger.info('============================');

    const selector = {
      meetingId,
      externalId,
    };

    const modifier = {
      meetingId,
      externalId,
      model,
      name,
    };

    const { insertedId } = await Pads.upsertAsync(selector, modifier);

    if (insertedId) {
      Logger.info(`Added pad group external=${externalId} meeting=${meetingId}`);
      // Each group will get only one pad so we can control access per pad. The pad's name
      // will be the group's externalId
      createPad(meetingId, userId, externalId, externalId, defaultText);
    } else {
      Logger.info(`Upserted pad group external=${externalId} meeting=${meetingId}`);
    }
  } catch (err) {
    Logger.error(`Adding pad group to the collection: ${err}`);
  }
}
