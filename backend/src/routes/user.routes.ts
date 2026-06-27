import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/user.controller';
import { authenticate, hasPermission } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', hasPermission('manage:employees'), getUsers);
router.get('/:id', hasPermission('manage:employees'), getUserById);
router.post('/', hasPermission('manage:employees'), createUser);
router.put('/:id', hasPermission('manage:employees'), updateUser);
router.delete('/:id', hasPermission('manage:employees'), deleteUser);

export default router;
