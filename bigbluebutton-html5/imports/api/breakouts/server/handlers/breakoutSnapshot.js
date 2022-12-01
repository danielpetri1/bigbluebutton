import { check } from 'meteor/check';
import breakoutSnapshot from '../modifiers/breakoutSnapshot';

export default function handleBreakoutSnapshot({ body }) {
  const { fileURI, presId, parentMeetingId, breakoutId } = body;
  check(fileURI, String);
  check(presId, String);
  check(parentMeetingId, String);
  check(breakoutId, String);

  return breakoutSnapshot(fileURI, presId, parentMeetingId, breakoutId);
}
