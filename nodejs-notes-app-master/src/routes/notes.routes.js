import { Router } from "express";
import {
  renderNoteForm,
  createNewNote,
  renderNotes,
  renderEditForm,
  updateNote,
  deleteNote,
  generatePDF,
  generatePDFCorreo,
  downloadFile,
  renderUsers,
  updateUserRole,
  iniciarPago,
  exitoPago,
  cancelarPago,
  pagarConTarjeta,
  retornoPago,
  detallesPago,
  deleteUser
} from "../controllers/notes.controller.js";
import { isAuthenticated } from "../helpers/auth.js";

const router = Router();

// Orden Formulario
router.get("/notes/add", isAuthenticated, renderNoteForm);

// Envio de formulario
router.post("/notes/new-note", isAuthenticated, createNewNote);

// Obtener todas las ordenes
router.get("/notes", isAuthenticated, renderNotes);

// Obtener datos para editar orden
router.get("/notes/edit/:id", isAuthenticated, renderEditForm);

// Editar orden
router.put("/notes/edit-note/:id", isAuthenticated, updateNote);

// Eliminar orden
router.delete("/notes/delete/:id", isAuthenticated, deleteNote);

// Generar correo
router.get("/generate-pdf/:id", isAuthenticated, generatePDF);

// Enviar correo con PDF
router.get("/generate-pdf-correo/:id", isAuthenticated, generatePDFCorreo);

// Descargar archivos
router.get('/downloads/:fileName', downloadFile);

// Ver Usuarios
router.get("/notes/users", isAuthenticated, renderUsers);

router.delete("/notes/users/delete/:id", isAuthenticated, deleteUser);

router.put("/notes/users/edit-role/:id", isAuthenticated, updateUserRole);

//Paypal
router.get('/pagar/:id', isAuthenticated, iniciarPago);

// Ruta para manejar el retorno de PayPal
router.get('/retorno-pago', retornoPago);

router.get('/exito', isAuthenticated, exitoPago);

router.get('/cancelar', isAuthenticated, cancelarPago);

router.get('/pagar-con-tarjeta', isAuthenticated, pagarConTarjeta);

// Ruta para mostrar los detalles del pago
router.get('/detalles/:id', detallesPago);





export default router;
