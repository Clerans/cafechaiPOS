import { Router } from 'express';
import {
  getRoles,
  getPermissions,
  updateRolePermissions,
} from '../controllers/role.controller';
import { authenticate, hasPermission } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Retrieving roles/permissions can be viewed by managers/admins
router.get('/', getRoles);
router.get('/permissions', getPermissions);

// Updating mapping requires manage:settings or similar admin privileges
router.put('/:id/permissions', hasPermission('manage:settings'), updateRolePermissions);

export default router;
