// auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth');

// Rotas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password/request', authController.requestPasswordReset);
router.post('/forgot-password/confirm', authController.confirmPasswordReset);
router.get('/verify', authController.verifyToken);

// Rotas protegidas
router.get('/profile', authMiddleware, authController.getProfile);

// Rotas do Google OAuth
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);
router.post('/google/verify', authController.verifyGoogleAuth);

module.exports = router;
