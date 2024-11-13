import { Router } from "express";
import {
  renderSignUpForm,
  signup,
  renderSigninForm,
  signin,
  logout,
  renderForgotPasswordForm,
  forgotPassword,
  renderResetPasswordForm,
  resetPassword,
  signinWithToken

} from "../controllers/auth.controllers.js";

const router = Router();

// Routes
router.get("/auth/signup", renderSignUpForm);

router.post("/auth/signup", signup);

router.get("/auth/signin", renderSigninForm);

router.post("/auth/signin", signin);

router.get("/auth/logout", logout);

router.get("/dashboard", (req, res) => {
  if (req.isAuthenticated()) {
    if (req.user.rol === 'admin') {
      return res.redirect("/notes");
    } 
    if (req.user.rol === 'almacen') {
      return res.redirect("/piezas");
    } 
    if (req.user.rol === 'user'){
      return res.redirect("/notes");
    }
  }
  res.redirect('/auth/signin');
});

router.get('/auth/forgot-password', renderForgotPasswordForm);

router.post('/auth/forgot-password', forgotPassword);

router.get('/auth/reset-password/:token', renderResetPasswordForm);

router.post('/auth/reset-password/:token', resetPassword);

router.get("/auth/email-confirmation", (req, res) => {
  res.render("email-confirmation");
});

// Define la ruta para manejar el enlace de inicio de sesión con token
router.get("/auth/login/:token", signinWithToken);






export default router;
