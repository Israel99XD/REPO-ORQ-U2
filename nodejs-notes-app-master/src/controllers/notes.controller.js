import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import nodemailer from 'nodemailer';
import paypal from 'paypal-rest-sdk';
import Note from "../models/Note.js";
import Pieza from "../models/Pieza.js";
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración de multer para la subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'src/uploads');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Guardar solo el nombre original del archivo
  },
});

// Función de filtro para permitir solo imágenes
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true); // Aceptar el archivo
  } else {
    cb(new Error('Solo se permiten archivos de imagen.'), false); // Rechazar el archivo
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter
}).array('archivos', 5);

function generarNumeroFolio() {
  const fecha = new Date();
  const year = fecha.getFullYear().toString().slice(-2);
  const mes = ('0' + (fecha.getMonth() + 1)).slice(-2);
  const dia = ('0' + fecha.getDate()).slice(-2);
  const horas = ('0' + fecha.getHours()).slice(-2);
  const minutos = ('0' + fecha.getMinutes()).slice(-2);
  const segundos = ('0' + fecha.getSeconds()).slice(-2);
  const milisegundos = ('00' + fecha.getMilliseconds()).slice(-3);

  const folio = year + mes + dia + horas + minutos + segundos + milisegundos;
  return folio;
};

export const renderNoteForm = (req, res) => {
  const folio = generarNumeroFolio();
  res.render('notes/new-note', { folio });
}

export const createNewNote = async (req, res) => {
  return new Promise((resolve, reject) => {
    upload(req, res, async (err) => {
      try {
        const errors = [];
        if (err) {
          errors.push({ text: 'Error al subir archivo, asegurate de cargar solo imagenes "(jpg|jpeg|png|gif)"' });
        }
         // Validación para permitir solo imágenes
         req.files.forEach(file => {
          if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            errors.push({ text: 'Solo se permiten archivos de imagen.' });
          }
        });
        const {
          nombre,
          descripcion,
          receptor,
          contrasenaEquipo,
          respaldo,
          passEquipo,
          malEquipo,
          descripcionDanio,
          status,
          nServicio,
          presupuesto,
          nTelefono,
          email
        } = req.body;
        if (!nombre) {
          errors.push({ text: "Por favor ingrese un nombre" });
        }
        if (!descripcion) {
          errors.push({ text: "Por favor ingrese una descripción" });
        }
        if (!nTelefono) {
          errors.push({ text: "Por favor ingrese un número de teléfono" });
        }
        if (!email) {
          errors.push({ text: "Por favor ingrese un correo electrónico" });
        }

        if (errors.length > 0) {
          return res.render("notes/new-note", {
            errors,
            nombre,
            nServicio,
            descripcion,
            receptor,
            contrasenaEquipo,
            respaldo,
            passEquipo,
            malEquipo,
            descripcionDanio,
            status,
            presupuesto,
            nTelefono,
            email
          });
        }

        const newNote = new Note({
          nombre,
          descripcion,
          receptor,
          contrasenaEquipo,
          respaldo,
          passEquipo,
          malEquipo,
          descripcionDanio,
          status,
          nServicio,
          presupuesto,
          nTelefono,
          email,
          user: req.user.id,
        });
        newNote.user = req.user.id;
        if (req.files && req.files.length > 0) {
          newNote.archivos = req.files.map((file) => {
            const fileName = file.originalname; // Obtener solo el nombre del archivo
            return fileName;
          });
        }
        await newNote.save();
        req.flash("success_msg", "Orden registrada correctamente");
        res.redirect("/notes");

        console.log(req.files);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

export const renderNotes = async (req, res) => {
  // Verificar si el usuario está autenticado y obtener su información
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: "Usuario no autenticado" });
  }

  try {
    let notes;
    if (user.rol === "admin") {
      // Si el usuario es admin, mostrar todas las notas
      notes = await Note.find({}).sort({ date: "desc" }).lean();
    } else {
      // Si el usuario es user, mostrar solo las notas que él/ella creó
      notes = await Note.find({ user: req.user.id }).sort({ date: "desc" }).lean();
    }
    res.render("notes/all-notes", { notes });
  } catch (error) {
    console.error("Error al obtener las notas:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export const renderEditForm = async (req, res) => {
  const note = await Note.findById(req.params.id).lean();
  const piezas = await Pieza.find({}).lean(); // Obtener todas las piezas
  const tareas = await Note.find({}, { descripcion: 1 }).lean();
  res.render("notes/edit-note", { note, piezas, tareas });
};

export const updateNote = async (req, res) => {
  const {
    status,
    piezas, // Piezas seleccionadas como un array
    presupuesto
  } = req.body;

  const noteId = req.params.id;

  // Verifica si se proporcionó un estado, de lo contrario, asigna un valor predeterminado
  const updatedStatus = status || 'Estado predeterminado';

  try {
    // Actualiza el estado de la nota
    await Note.findByIdAndUpdate(noteId, { status: updatedStatus, presupuesto: presupuesto });

    if (piezas) {
      const selectedPieza = await Pieza.findById(piezas);

      if (selectedPieza && selectedPieza.cantidad > 0) {
        // Crear un objeto que represente la pieza seleccionada
        const piezaSeleccionada = {
          id: selectedPieza._id,
          nombre: selectedPieza.nombre,
          precio: selectedPieza.precio
        };

        const noteOLD = await Note.findById(noteId);
        noteOLD.piezas.push(piezaSeleccionada);
        await noteOLD.save();

        selectedPieza.cantidad -= 1;
        await selectedPieza.save();
      } else if (!selectedPieza) {
        req.flash("error_msg", "La pieza seleccionada no existe");
      } else {
        req.flash("error_msg", "No hay suficientes piezas disponibles");
      }
    }
    req.flash("success_msg", "Orden actualizada correctamente");
  } catch (error) {
    console.error(error);
    req.flash("error_msg", "Error al actualizar la orden");
  }

  res.redirect("/notes");
};

export const deleteNote = async (req, res) => {
  await Note.findByIdAndDelete(req.params.id);
  req.flash("success_msg", "Eliminado correctamente");
  res.redirect("/notes");
};

export const generatePDF = async (req, res) => {
  try {
    const templatePath = join(__dirname, '..', 'views', 'template.hbs');
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateContent);
    const { id } = req.params;
    const notes = await Note.findById(id);
    const data = {
      nombre: notes.nombre,
      nServicio: notes.nServicio,
      nTelefono: notes.nTelefono,
      date: notes.date,
      receptor: notes.receptor,
      presupuesto: notes.presupuesto,
      piezas: notes.piezas,
      descripcion: notes.descripcion
    };

    const html = template(data);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);

    const pdf = await page.pdf();
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=archivo.pdf');
    res.send(pdf);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error interno del servidor');
  }
};

export const generatePDFCorreo = async (req, res) => {
  try {
    const templatePath = join(__dirname, '..', 'views', 'template.hbs');
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateContent);
    const { id } = req.params;

    const notes = await Note.findById(id);
    const user = await User.findById(notes.user);
    const data = {
      nombre: notes.nombre,
      nServicio: notes.nServicio,
      nTelefono: notes.nTelefono,
      date: notes.date,
      receptor: notes.receptor,
      presupuesto: notes.presupuesto,
      piezas: notes.piezas,
      descripcion: notes.descripcion
    };

    const html = template(data);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);

    const pdf = await page.pdf();
    await browser.close();

    const pdfPath = join(__dirname, '..', 'temp', 'archivo.pdf');
    fs.writeFileSync(pdfPath, pdf);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'seriscompany@gmail.com',
        pass: 'vjga kagu wxdm jxsv'
      }
    });

    const source = fs.readFileSync(join(__dirname, '..', 'views', 'plantilla.hbs'), 'utf8');
    const plantilla = handlebars.compile(source);

    async function enviarCorreo(destinatario, asunto, datos) {
      const html = plantilla(datos);
      const mailOptions = {
        from: 'seriscompany@gmail.com',
        to: destinatario,
        subject: asunto,
        html: html,
        attachments: [
          {
            filename: 'archivo.pdf',
            path: pdfPath
          }
        ]
      };
      try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Correo enviado: %s', info.messageId);
      } catch (error) {
        console.error('Error al enviar el correo:', error);
      }
    }
    enviarCorreo(
      notes.email,
      notes.nombre + ' Tu Orden de Trabajo con numero de  servicio ' + notes.nServicio + ' esta terminada ',
      { nombre: notes.nombre, mensaje: 'Su equipo está listo, le envío su nota de remisión para que pueda pasar a recoger su equipo' }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=archivo.pdf');
    res.sendFile(pdfPath);
  } catch (error) {
    console.error('Error al generar el PDF y enviar el correo:', error);
    res.status(500).send('Error interno del servidor');
  }
};

export const downloadFile = (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, '..', 'uploads', fileName);

  // Envía el archivo como respuesta
  res.download(filePath, fileName, (err) => {
    if (err) {
      // Manejar errores
      console.error('Error al descargar el archivo:', err);
      res.status(404).send('Archivo no encontrado');
    }
  });
};

export const renderUsers = async (req, res) => {
  try {
    // Verificar si el usuario está autenticado y tiene rol de administrador
    if (!req.user || req.user.rol !== "admin") {
      return res.status(401).send("Acceso no autorizado");
    }

    const userList = await User.find().lean();
    res.render('notes/users', { users: userList });

  } catch (error) {
    console.error('Error al obtener la lista de usuarios:', error);
    res.status(500).send('Error interno del servidor');
  }
};


export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { newRole } = req.body;

  try {
    // Busca el usuario por su ID
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).send('Usuario no encontrado');
    }
    // Actualiza el rol del usuario
    user.rol = newRole;
    // Guarda los cambios en la base de datos
    await user.save();
    // Redirige a la lista de usuarios después de la actualización
    res.redirect('/notes/users');
  } catch (error) {
    console.error('Error al actualizar el rol del usuario:', error);
    res.status(500).send('Error interno del servidor');
  }
};

// Define la función para eliminar usuarios
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si el usuario está autenticado y tiene rol de administrador
    if (!req.user || req.user.rol !== "admin") {
      return res.status(401).send("Acceso no autorizado");
    }

    // Elimina el usuario por su ID
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      req.flash("error_msg", "Usuario no encontrado");
    }

    // Redirige a la lista de usuarios después de la eliminación
    res.redirect('/notes/users');
  } catch (error) {
    console.error('Error al eliminar el usuario:', error);
    res.status(500).send('Error interno del servidor al eliminar el usuario');
  }
};

// Configurar PayPal
paypal.configure({
  mode: 'sandbox', // sandbox o live
  client_id: 'ASIgzSJrOEqIHcOqomEO_f1DA_jIa6Gr4FrbAPx7lPkRKtnPGTPGWHurklxkeU8CTYMoHW8G61xP1SCw',
  client_secret: 'EOb2t0oX5JlGbaHYpcCsFr5rT123fj_gXH-fhspWjALyDTqbkn4Ux0ZFwEB5UTrNzGnWdp778OD3uyFm'
});

// Controlador para iniciar el pago
export const iniciarPago = async (req, res) => {
  try {
    const id = req.params.id;
    console.log("ID de la orden:", id);
    const notes = await Note.findById(id).lean();

    // Obtener todas las piezas de la orden
    const piezas = notes.piezas;
    const nServicio = notes.nServicio.toString();

    // Crear la lista de items para la transacción de PayPal
    const items = piezas.map(pieza => {
      return {
        name: pieza.nombre,
        sku: nServicio,
        price: pieza.precio.toString(),
        currency: 'MXN',
        quantity: 1
      };
    });

    // Agregar el presupuesto como un nuevo item
    items.push({
      name: 'Presupuesto',
      sku: 'presupuesto',
      price: notes.presupuesto.toString(),
      currency: 'MXN',
      quantity: 1
    });

    // Calcular el precio total sumando los precios de todas las piezas y el presupuesto
    const totalPiezas = piezas.reduce((acc, pieza) => acc + pieza.precio, 0);
    const total = totalPiezas + notes.presupuesto;

    console.log("Total de piezas a pagar: " + "$" + totalPiezas);
    console.log("Total a pagar con mano de Obra: " + "$" + total);

    const payment = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      redirect_urls: {
        return_url: 'http://localhost:5000/retorno-pago',
        cancel_url: 'http://localhost:5000/cancelar'
      },
      transactions: [{
        item_list: {
          items: items
        },
        amount: {
          currency: 'MXN',
          total: total.toString()
        },
        description: `Descripción de la orden: ${id}`
      }]
    };

    // Crear el pago en PayPal
    paypal.payment.create(payment, function (error, payment) {
      if (error) {
        console.error(error);
        throw error;
      } else {
        // Redirigir al usuario a PayPal solo si la orden se ha guardado correctamente
        for (let i = 0; i < payment.links.length; i++) {
          if (payment.links[i].rel === 'approval_url') {
            res.redirect(payment.links[i].href);
            return; // Detener la ejecución para evitar redirigir dos veces
          }
        }
      }
    });
  } catch (error) {
    console.error('Error al iniciar el pago:', error);
    res.status(500).send('Error al iniciar el pago');
  }
};

// Ruta para manejar el retorno de PayPal después del pago
export const retornoPago = async (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  const execute_payment_json = {
    payer_id: payerId
  };

  try {
    paypal.payment.execute(paymentId, execute_payment_json, async function (error, payment) {
      if (error) {
        console.error('Error al ejecutar el pago:', error);
        req.flash('error', 'Error al ejecutar el pago.');
        return res.redirect('/error'); // Redirigir a una página de error
      } else {
        // Verificar el estado del pago en la respuesta de PayPal
        if (payment.state === 'approved') {
          // Actualizar el estado de la orden en la base de datos
          const orderId = payment.transactions[0].description.split(': ')[1];
          await Note.findByIdAndUpdate(orderId, { status: 'PAGADO' });

          // Guardar los detalles de la transacción en la base de datos
          const transactionDetails = {
            paymentId: paymentId,
            payerId: payerId,
            paymentStatus: payment.state,
            amount: payment.transactions[0].amount.total,
            paymentDate: new Date() // Guardar la fecha actual como la fecha de pago
            // Otros campos que desees guardar
          };
          // Asegúrate de tener un campo en tu modelo de datos para almacenar estos detalles de transacción
          await Note.findByIdAndUpdate(orderId, { $set: { transactionDetails } });

          // Redirigir a la página de detalles de pago
          res.redirect(`/detalles/${orderId}`);
        } else {
          req.flash('error', 'El pago no fue aprobado.');
          return res.redirect('/error'); // Redirigir a una página de error
        }
      }
    });
  } catch (error) {
    console.error('Error al procesar el retorno de PayPal:', error);
    req.flash('error', 'Error al procesar el retorno de PayPal.');
    return res.redirect('/error'); // Redirigir a una página de error
  }
};

// Controlador para éxito
export const exitoPago = (req, res) => {
  res.redirect('/notes');
};

// Controlador para cancelar
export const cancelarPago = (req, res) => {
  res.redirect('/notes');
};

//Fin pago paypal

//Pago Credit Card
export const pagarConTarjeta = (req, res) => {
  // Lógica para manejar el pago con tarjeta
  res.render('notes/pagos-credit-card');
};

// Controlador para mostrar los detalles del pago
export const detallesPago = async (req, res) => {
  try {
    const id = req.params.id;
    // Buscar la orden en la base de datos
    const order = await Note.findById(id).lean();

    // Verificar si hay datos de PayPal en la orden
    const detallesPago = {
      ...order.transactionDetails,
      nServicio: order.nServicio // Agregar el número de servicio a los detalles del pago
    };

    // Renderizar la vista de detalles del pago y pasar los datos
    res.render('notes/detalles-pago', { orderId: id, fechaPago: order.fechaPago, detallesPago });
  } catch (error) {
    console.error('Error al mostrar los detalles del pago:', error);
    res.status(500).send('Error al mostrar los detalles del pago');
  }
};

