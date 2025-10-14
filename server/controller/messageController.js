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
        // Utiliser les bons noms de champs selon le modèle
        const newMessage = new Message({ senderId, receiverId, content });
        await newMessage.save();
        res.status(201).json({ message: 'Message sent successfully', data: newMessage });
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const getMessages = async (req, res) => {
    const { userId1, userId2 } = req.params;
    console.log(`Récupération messages entre ${userId1} et ${userId2}`);
    
    try {
        const messages = await Message.find({
            $or: [
                { senderId: userId1, receiverId: userId2 },
                { senderId: userId2, receiverId: userId1 }
            ]
        }).populate('senderId', 'username')
          .populate('receiverId', 'username')
          .sort({ timestamp: 1 });
          
        console.log(`${messages.length} messages trouvés`);
        res.status(200).json({ messages });
    } catch (err) {
        console.error('Get messages error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};


module.exports = { sendMessage, getMessages };