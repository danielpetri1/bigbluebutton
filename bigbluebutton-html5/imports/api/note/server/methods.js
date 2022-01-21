import { Meteor } from 'meteor/meteor';
import getNoteId from './methods/getNoteId';
import getHtml from './methods/getHtml';

Meteor.methods({
  getNoteId,
  getHtml,
});
