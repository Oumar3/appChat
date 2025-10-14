const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./userModel');
const Group = require('./groupeModel');

const messageSchema = new Schema({
  senderId: {type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: {type: Schema.Types.ObjectId, ref: 'User', required: true },
  groupId: {type: Schema.Types.ObjectId, ref: 'Group', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true // Ajoute automatiquement createdAt et updatedAt
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
