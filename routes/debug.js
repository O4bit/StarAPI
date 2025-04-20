const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

router.get('/auth-check', authenticateToken, (req, res) => {
    res.json({
        message: 'Authentication successful',
        user: {
            id: req.user.id,
            role: req.user.role,
            isBotRequest: req.user.isBotRequest || false
        }
    });
});

module.exports = router;