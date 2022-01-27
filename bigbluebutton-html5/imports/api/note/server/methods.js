import { Meteor } from 'meteor/meteor';
import getNoteId from './methods/getNoteId';
import getPdf from './methods/getPdf';

Meteor.methods({
  getNoteId,
  getPdf,
});
