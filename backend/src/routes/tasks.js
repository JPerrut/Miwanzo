const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

// Todas as rotas já são protegidas pelo middleware no server.js
router.post('/', taskController.createTask);
router.get('/', taskController.getTasksBySection);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;