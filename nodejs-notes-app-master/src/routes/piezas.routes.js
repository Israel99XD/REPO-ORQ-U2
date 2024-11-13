import { Router } from "express";
import {
  renderPiezaForm,
  createNewPieza,
  renderPiezas,
  EliminarPieza,
  deletePieza,
} from "../controllers/piezas.controller.js";
import { isAuthenticated } from "../helpers/auth.js";

const router = Router();

// New Pieza
router.get("/piezas/add", isAuthenticated, renderPiezaForm);

router.post("/piezas/new-pieza", isAuthenticated, createNewPieza);

// Get All Piezas
router.get("/piezas", isAuthenticated, (req, res, next) => {
  if (req.user.rol !== 'almacen') {
    req.flash("error_msg", "No estás autorizado para acceder a esta página.");
    return res.redirect("/"); // Puedes redirigir a la página de inicio o a donde prefieras
  }
  next();
}, renderPiezas);

// Edit Piezas
router.delete("/piezas/eliminar/:id", isAuthenticated, EliminarPieza);

// Delete Piezas
router.delete("/piezas/delete/:id", isAuthenticated, deletePieza);

export default router;