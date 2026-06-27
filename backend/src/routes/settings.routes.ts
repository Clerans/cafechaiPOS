import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller';
import { authenticate, hasPermission } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// View settings is available to authenticated users (to load tax, timezone, currency, business name)
router.get('/', getSettings);

// Editing requires setting permission
router.put('/', hasPermission('manage:settings'), updateSettings);

export default router;
