const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/sectionController');

router.post('/', sectionController.createSection);
router.get('/', sectionController.getSectionsByWorkArea);
router.get('/:id', sectionController.getSection);
router.delete('/:id', sectionController.deleteSection);
router.put('/:id', sectionController.updateSection);

module.exports = router;