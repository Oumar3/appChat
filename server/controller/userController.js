const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/token');

// Register a new user
exports.register = async (req, res) => {
    const { username, password } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Login a user
exports.login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        const token = generateToken(user._id, user.username);
        res.status(200).json({ 
            message: 'Login successful', 
            user: { _id: user._id, username: user.username },
            token 
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Logout a user
exports.logout = async (req, res) => {
    try {
        // Clear any server-side session data if needed
        // The main logout happens on the client side by removing the token
        
        res.status(200).json({ 
            message: 'Logout successful',
            instruction: 'Please clear your token and redirect to login page'
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all users (except current user)
exports.getAllUsers = async (req, res) => {
    try {
        
        const users = await User.find();
        res.status(200).json({ users });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};