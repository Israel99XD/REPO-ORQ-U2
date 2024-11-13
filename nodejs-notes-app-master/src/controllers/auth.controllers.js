import User from "../models/User.js";
import nodemailer from 'nodemailer';
import passport from "passport";
import bcryptjs from "bcryptjs";
import crypto from 'crypto';
import { createTransport } from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from "path";

export const renderSignUpForm = (req, res) => res.render("auth/signup");

export const signup = async (req, res) => {
  let errors = [];
  const { name, email, password, confirm_password } = req.body;
  if (password !== confirm_password) {
    errors.push({ text: "La contraseña no coincide." });
  }

  if (password.length < 8) {
    errors.push({ text: "Las contraseñas deben tener al menos 8 caracteres." });
  }

  if (errors.length > 0) {
    return res.render("auth/signup", {
      errors,
      name,
      email,
      password,
      confirm_password,
    });
  }

  // Look for email coincidence
  const userFound = await User.findOne({ email: email });
  if (userFound) {
    req.flash("error_msg", "El correo ya está en uso.");
    return res.redirect("/auth/signup");
  }

  // Saving a New User
  const newUser = new User({ name, email, password });
  newUser.password = await newUser.encryptPassword(password);
  await newUser.save();
  req.flash("success_msg", "Ya estás registrado.");
  res.redirect("/auth/signin");
};

export const renderSigninForm = (req, res) => res.render("auth/signin");

export const signinWithToken = async (req, res) => {
  try {
    const user = await User.findOne({
      loginToken: req.params.token,
      loginTokenExpires: { $gt: Date.now() }
    });
    if (!user) {
      req.flash("error_msg", "El token de inicio de sesión no es válido o ha caducado.");
      return res.redirect("/auth/signin");
    }

    // Eliminar el token de inicio de sesión después de validar
    user.loginToken = undefined;
    user.loginTokenExpires = undefined;
    await user.save();

    // Iniciar sesión automáticamente
    req.logIn(user, async (err) => {
      if (err) {
        console.error(err);
        req.flash("error_msg", "Error al iniciar sesión automáticamente.");
        return res.redirect("/auth/signin");
      }
      req.flash("success_msg", "Inicio de sesión exitoso.");
      res.redirect("/dashboard");
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Error al iniciar sesión con el token.");
    res.redirect("/auth/signin");
  }
};

export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      req.flash("error_msg", "Credenciales inválidas o correo electrónico no encontrado");
      return res.redirect("/auth/signin");
    }

    // Verificar la contraseña utilizando el método matchPassword
    const validPassword = await user.matchPassword(password);
    if (!validPassword) {
      req.flash("error_msg", "Contraseña incorrecta");
      return res.redirect("/auth/signin");
    }

    // Generar y almacenar el token de inicio de sesión en el usuario
    const token = crypto.randomBytes(20).toString('hex');
    user.loginToken = token;
    user.loginTokenExpires = Date.now() + 3600000; // 1 hora
    await user.save();

    // Crear transporte Nodemailer
    const transporter = createTransport({
      service: 'gmail',
      auth: {
        user: 'seriscompany@gmail.com',
        pass: 'vjga kagu wxdm jxsv',
      },
    });

    // Ruta de la imagen adjunta
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const imagePath = path.join(__dirname, '../public/img/logo.jpg');

    // URL de inicio de sesión
    const loginUrl = `${req.protocol}://${req.get('host')}/auth/login/${token}`;

    // Plantilla HTML del correo electrónico con estilos en línea
    const htmlTemplate = `
  <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          background-color: #f0f0f0;
        }

        .container {
          width: 80%;
          margin: 50px auto;
          background-color: #fff;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          text-align: center;
          border-color: #0071dc;
        }

        h1 {
          color: #333;
        }

        p {
          color: #666;
          line-height: 1.5;
        }
        .projo{
          color:red;
          line-heighr: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="card">
      <div class="container">
        <h1>Bienvenido a nuestro sitio web</h1>
        <p class="projo">¡Estas intentando iniciar sesión, si no fuiste tu, haz caso omiso a esté córreo.</p>
        <p>¡Gracias por visitarnos! Esperamos que disfrutes de tu estancia aquí.</p>
        <div style="padding: 20px; background-color: #f8f9fa;">
          <h2 style="margin-top: 20px; color: #343a40;">Inicio de sesión</h2>
          <img src="cid:imagen_adjunta" alt="Imagen Adjunta" style="height: 200px;">
          <p style="color: #6c757d;">Haga clic en el siguiente enlace para iniciar sesión:</p>
          <a href="${loginUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">Iniciar sesión</a>
        </div>
      </div>
      </div>
    </body>
  </html>
`;
    // Opciones del correo electrónico
    const mailOptions = {
      from: 'seriscompany@gmail.com',
      to: user.email,
      subject: 'Inicio de sesión',
      html: htmlTemplate,
      attachments: [{
        filename: 'nombre_de_la_imagen.jpg', // Nombre de la imagen adjunta
        path: imagePath,
        cid: 'imagen_adjunta' // Identificador para la imagen adjunta
      }]
    };

    // Enviar el correo electrónico con la imagen adjunta
    await transporter.sendMail(mailOptions);

    req.flash("success_msg", "Se ha enviado un correo electrónico con instrucciones para iniciar sesión.");
    res.redirect("/auth/signin");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Error al iniciar sesión con el enlace: " + err.message); // Agregamos el mensaje de error al flash
    res.redirect("/auth/signin");
  }
};
/*export const signin = passport.authenticate("local", {
  
  successRedirect: "/notes",
  failureRedirect: "/auth/signin",
  failureFlash: true,
});*/

export const logout = async (req, res, next) => {
  await req.logout((err) => {
    if (err) return next(err);
    req.flash("success_msg", "Estás desconectado ahora.");
    res.redirect("/auth/signin");
  });
};

export const renderForgotPasswordForm = (req, res) => res.render("auth/forgot-password");

export const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      req.flash("error_msg", "No existe ninguna cuenta con esa dirección de correo electrónico.");
      return res.redirect("/auth/forgot-password");
    }

    // Generar un token de reinicio de contraseña
    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora

    await user.save();

    // Enviar correo electrónico con el enlace de restablecimiento de contraseña
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'seriscompany@gmail.com',
        pass: 'vjga kagu wxdm jxsv',
      },
    });

    const resetPasswordUrl = `http://${req.headers.host}/auth/reset-password/${token}`;

    // Ruta de la imagen adjunta
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const imagePath = path.join(__dirname, '../public/img/logo.jpg');

    const htmlTemplate = `
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              background-color: #f0f0f0;
            }

            .container {
              width: 80%;
              margin: 50px auto;
              background-color: #fff;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
              text-align: center;
            }

            h1 {
              color: #333;
            }

            p {
              color: #666;
              line-height: 1.5;
            }

            .reset-link {
              display: inline-block;
              padding: 10px 20px;
              background-color: #007bff;
              color: #fff; /* Cambiar color del texto a blanco */
              text-decoration: none;
              border-radius: 5px;
            }
          
            .reset-link:hover {
              background-color: #0056b3;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Restablecer Contraseña</h1>
            <img src="cid:imagen_adjunta" alt="Logo" style="height: 200px;">
            <p>Hola,</p>
            <p>Recibiste este correo porque solicitaste restablecer tu contraseña.</p>
            <p>Por favor haz clic en el siguiente enlace o cópialo y pégalo en tu navegador para restablecer tu contraseña:</p>
            <a href="${resetPasswordUrl}" class="reset-link">Restablecer Contraseña</a>
            <p>Si no solicitaste este cambio, puedes ignorar este correo y tu contraseña permanecerá sin cambios.</p>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: 'seriscompany@gmail.com',
      to: user.email,
      subject: 'Reestablecer Contraseña',
      html: htmlTemplate,
      attachments: [{
        filename: 'nombre_de_la_imagen.jpg', // Nombre de la imagen adjunta
        path: imagePath,
        cid: 'imagen_adjunta' // Identificador para la imagen adjunta
      }]
    };

    await transporter.sendMail(mailOptions);
    req.flash("success_msg", "Se ha enviado un correo electrónico a: " + user.email + " con instrucciones para restablecer la contraseña.");
    res.redirect("/auth/forgot-password");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Error al enviar el correo electrónico para restablecer la contraseña.");
    res.redirect("/auth/forgot-password");
  }
};


export const renderResetPasswordForm = async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      req.flash("error_msg", "El token de restablecimiento de contraseña no es válido o ha caducado.");
      return res.redirect("/auth/forgot-password");
    }
    res.render("auth/reset-password", { token: req.params.token });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Error al renderizar el formulario de restablecimiento de contraseña.");
    res.redirect("/auth/forgot-password");
  }
};

export const resetPassword = async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      req.flash("error_msg", "El token de restablecimiento de contraseña no es válido o ha caducado.");
      return res.redirect("/auth/forgot-password");
    }

    // Verificar que las contraseñas coincidan
    if (req.body.password !== req.body.confirm_password) {
      req.flash("error_msg", "Las contraseñas no coinciden.");
      return res.redirect(`/auth/reset-password/${req.params.token}`);
    }

    // Establecer la nueva contraseña
    user.password = await bcryptjs.hash(req.body.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Enviar confirmación por correo electrónico o redirigir a la página de inicio de sesión
    req.flash("success_msg", "Su contraseña se ha restablecido correctamente.");
    res.redirect("/auth/signin");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Error al restablecer la contraseña.");
    res.redirect("/auth/forgot-password");
  }
};
