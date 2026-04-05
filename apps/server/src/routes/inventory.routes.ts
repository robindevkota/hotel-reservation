import { Router } from 'express';
import multer from 'multer';
import * as inv from '../controllers/inventory.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { adminOnly, adminOrStaff } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Stats (read — admin or staff)
router.get('/stats', ...requireStaff, adminOrStaff, inv.stats);

// Ingredients
router.get('/ingredients',          ...requireStaff, adminOrStaff, inv.listIngredients);
router.post('/ingredients',         ...requireStaff, adminOnly, inv.ingredientValidation, validate, inv.createIngredient);
router.put('/ingredients/:id',      ...requireStaff, adminOnly, inv.updateIngredient);
router.delete('/ingredients/:id',   ...requireStaff, adminOnly, inv.deleteIngredient);
router.post('/ingredients/:id/restock', ...requireStaff, adminOnly, inv.restockIngredient);

// Recipes
router.get('/recipes',          ...requireStaff, adminOrStaff, inv.listRecipes);
router.post('/recipes',         ...requireStaff, adminOnly, inv.recipeValidation, validate, inv.createRecipe);
router.put('/recipes/:id',      ...requireStaff, adminOnly, inv.updateRecipe);
router.delete('/recipes/:id',   ...requireStaff, adminOnly, inv.deleteRecipe);

// Sell
router.post('/sell', ...requireStaff, adminOrStaff, inv.sell);

// Logs
router.get('/logs', ...requireStaff, adminOrStaff, inv.getLogs);

// Excel import
router.post('/import', ...requireStaff, adminOnly, upload.single('file'), inv.importExcel);

export default router;
