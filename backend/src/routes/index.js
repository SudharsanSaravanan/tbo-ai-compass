const express = require('express');
const router = express.Router();

// Import route modules
// const userRoutes = require('./userRoutes');
// const tripRoutes = require('./tripRoutes');

// Use routes
// router.use('/users', userRoutes);
// router.use('/trips', tripRoutes);

// Default API route
router.get('/', (req, res) => {
    res.json({
        message: 'Trip Weaver API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            api: '/api'
        }
    });
});

module.exports = router;
