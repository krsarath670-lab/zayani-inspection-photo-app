const jwt = require('jsonwebtoken');
const { db } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'zayani-secret-key-2026-safe-secure-token';

function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Fallback for query param (e.g. for downloading files / viewing photos)
        const tokenQuery = req.query.token;
        if (tokenQuery) {
            try {
                const decoded = jwt.verify(tokenQuery, JWT_SECRET);
                req.user = decoded;
                return next();
            } catch (e) {
                return res.status(401).json({ error: 'Invalid or expired token' });
            }
        }
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = {
    JWT_SECRET,
    generateToken,
    authMiddleware
};
