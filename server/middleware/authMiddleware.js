const { verifyToken } = require('../utils/token');

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ 
                message: 'Access denied. No token provided.',
                code: 'NO_TOKEN'
            });
        }

        // Extraire le token
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ 
                message: 'Access denied. Token is missing.',
                code: 'MISSING_TOKEN'
            });
        }

        // Vérifier le token
        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(401).json({ 
                message: 'Access denied. Invalid or expired token.',
                code: 'INVALID_TOKEN'
            });
        }
        
        // Ajouter les infos utilisateur à la requête
        req.user = {
            id: decoded.id,
            username: decoded.username
        };
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ 
            message: 'Internal server error during authentication.',
            code: 'AUTH_ERROR'
        });
    }
};

module.exports = authMiddleware;
