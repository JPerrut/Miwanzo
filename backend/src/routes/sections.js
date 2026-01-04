const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/sectionController');

// Todas as rotas já são protegidas pelo middleware no server.js
router.post('/', sectionController.createSection);
router.get('/', sectionController.getSectionsByWorkArea);
router.get('/:id', sectionController.getSection);
router.delete('/:id', sectionController.deleteSection);

module.exports = router;