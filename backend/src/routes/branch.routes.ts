import { Router } from 'express';
import {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
} from '../controllers/branch.controller';
import { authenticate, hasPermission } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// All authenticated users can view branches (e.g. for dropdowns or visual cues)
router.get('/', getBranches);
router.get('/:id', getBranchById);

// Modifying branches requires permission
router.post('/', hasPermission('manage:branches'), createBranch);
router.put('/:id', hasPermission('manage:branches'), updateBranch);
router.delete('/:id', hasPermission('manage:branches'), deleteBranch);

export default router;
