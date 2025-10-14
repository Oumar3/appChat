const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./userModel');
const Group = require('./groupeModel');

const messageSchema = new Schema({
  senderId: {type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: {type: Schema.Types.ObjectId, ref: 'User', required: false }, // Pour messages privés
  groupId: {type: Schema.Types.ObjectId, ref: 'Group', required: false }, // Pour messages de groupe
  content: { type: String, required: true },
}, {
  timestamps: true // Ajoute automatiquement createdAt et updatedAt
});

// Validation : au moins receiverId ou groupId doit être présent
messageSchema.pre('save', function(next) {
  if (!this.receiverId && !this.groupId) {
    const error = new Error('Un message doit avoir soit un receiverId soit un groupId');
    return next(error);
  }
  next();
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
