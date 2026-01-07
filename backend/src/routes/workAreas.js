const express = require('express');
const router = express.Router();
const workAreaController = require('../controllers/workAreaController');

router.post('/', workAreaController.createWorkArea);
router.get('/', workAreaController.getWorkAreas);
router.get('/:id', workAreaController.getWorkArea);
router.put('/:id', workAreaController.updateWorkArea);
router.delete('/:id', workAreaController.deleteWorkArea);

module.exports = router;