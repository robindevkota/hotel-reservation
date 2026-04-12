import { Router } from 'express';
import multer from 'multer';
import * as inv from '../controllers/inventory.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/stats',                        ...requireStaff, requireAdmin, inv.stats);
router.get('/analytics',                    ...requireStaff, requireAdmin, inv.analytics);

router.get('/ingredients',                  ...requireStaff, requireAdmin, inv.listIngredients);
router.post('/ingredients',                 ...requireStaff, requireAdmin, inv.ingredientValidation, validate, inv.createIngredient);
router.put('/ingredients/:id',              ...requireStaff, requireAdmin, inv.updateIngredient);
router.delete('/ingredients/:id',           ...requireStaff, requireAdmin, inv.deleteIngredient);
router.post('/ingredients/:id/restock',     ...requireStaff, requireAdmin, inv.restockIngredient);

router.get('/recipes',                      ...requireStaff, requireAdmin, inv.listRecipes);
router.post('/recipes',                     ...requireStaff, requireAdmin, inv.recipeValidation, validate, inv.createRecipe);
router.put('/recipes/:id',                  ...requireStaff, requireAdmin, inv.updateRecipe);
router.delete('/recipes/:id',               ...requireStaff, requireAdmin, inv.deleteRecipe);

router.post('/sell',                        ...requireStaff, requireAdmin, inv.sell);
router.post('/consume',                     ...requireStaff, requireAdmin, inv.consumeValidation, validate, inv.consume);
router.post('/stocktake',                   ...requireStaff, requireAdmin, inv.stocktake);
router.get('/variance',                     ...requireStaff, requireAdmin, inv.varianceReport);
router.get('/logs',                         ...requireStaff, requireAdmin, inv.getLogs);
router.post('/import',                      ...requireStaff, requireAdmin, upload.single('file'), inv.importExcel);

export default router;
