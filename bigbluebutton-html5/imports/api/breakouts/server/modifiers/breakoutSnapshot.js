import Logger from '/imports/startup/server/logger';
import Breakouts from '/imports/api/breakouts';

export default function breakoutSnapshot(fileURI, presId, parentMeetingId, breakoutId) {
  try {
    const res = Breakouts.upsert({
      breakoutId,
    }, {
      $set: {
        fileURI,
        presId,
      },
    });

    Logger.info(res);
    Logger.info(`Received new snapshot: ${fileURI} for breakout: ${breakoutId}`);
  } catch (err) {
    Logger.error('Error on receiving snapshot');
    Logger.error(err);
  }
}
