const express = require('express');
const router = express.Router();
const workAreaController = require('../controllers/workAreaController');

// Todas as rotas já são protegidas pelo middleware no server.js
router.post('/', workAreaController.createWorkArea);
router.get('/', workAreaController.getWorkAreas);
router.get('/:id', workAreaController.getWorkArea);
router.put('/:id', workAreaController.updateWorkArea);
router.delete('/:id', workAreaController.deleteWorkArea);

module.exports = router;