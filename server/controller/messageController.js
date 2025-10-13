const Message = require('../models/messageModel');
const User = require('../models/userModel');


const sendMessage = async (req, res) => {
    const { senderId, receiverId, content } = req.body;
    try {
        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);
        if (!sender || !receiver) {
            return res.status(400).json({ message: 'Invalid sender or receiver' });
        }
        const newMessage = new Message({ sender: senderId, receiver: receiverId, content });
        await newMessage.save();
        res.status(201).json({ message: 'Message sent successfully', data: newMessage });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const getMessages = async (req, res) => {
    const { userId1, userId2 } = req.params;
    try {
        const messages = await Message.find({
            $or: [
                { sender: userId1, receiver: userId2 },
                { sender: userId2, receiver: userId1 }
            ]
        }).sort({ timestamp: 1 });
        res.status(200).json({ messages });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};


module.exports = { sendMessage, getMessages };