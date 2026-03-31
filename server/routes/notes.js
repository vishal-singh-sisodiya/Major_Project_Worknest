const express = require('express');
const { body, param } = require('express-validator');
const note = require('../controllers/noteController');
const { verifyToken } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();
router.use(verifyToken);

router.get('/:workspaceId', param('workspaceId').isMongoId(), handleValidation, note.listByWorkspace);

router.post('/', [body('workspaceId').isMongoId()], handleValidation, note.create);

router.put('/:id', param('id').isMongoId(), handleValidation, note.update);

router.delete('/:id', param('id').isMongoId(), handleValidation, note.remove);

module.exports = router;
