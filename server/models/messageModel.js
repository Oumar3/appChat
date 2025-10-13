const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./userModel');

const messageSchema = new Schema({
  senderId: {type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: {type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
