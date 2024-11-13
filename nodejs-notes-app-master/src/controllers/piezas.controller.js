import Pieza from "../models/Pieza.js";

export const renderPiezaForm = (req, res) => res.render("/piezas");

export const createNewPieza = async (req, res) => {
  const { nombre, cantidad, precio } = req.body;
  const errors = [];
  if (!nombre) {
    errors.push({ text: "Por favor ingrese un nombre" });
  }
  if (!cantidad) {
    errors.push({ text: "Por favor ingrese una cantidad" });
  }
  if (errors.length > 0)
    return res.render("piezas/all-piezas", {
      errors,
      nombre,
      cantidad,
      precio,
      marca,
      descripcion
    });

  try {
    const { nombre,
      cantidad,
      precio,
      marca,
      descripcion } = req.body;
    const piezaExistente = await Pieza.findOne({ nombre });
    if (piezaExistente) {
      piezaExistente.cantidad += parseInt(cantidad);
      await piezaExistente.save();
    } else {
      await Pieza.create({
        nombre,
        cantidad,
        precio,
        marca,
        descripcion
      });
    }
    res.redirect('/piezas');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error interno del servidor');
  }
};

export const renderPiezas = async (req, res) => {
  try {
    const piezas = await Pieza.find({ user: req.user.id }).sort({ date: "desc" }).lean();
    res.render('piezas/all-piezas', { piezas });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener las piezas');
  }
};

export const renderEditPiezaForm = async (req, res) => {
  const pieza = await Pieza.findById(req.params.id).lean();
  if (pieza.user != req.user.id) {
    req.flash("error_msg", "No autorizado");
    return res.redirect("/piezas");
  }
  res.render("piezas/eliminar", { pieza });
};

export const updatePieza = async (req, res) => {
  try {
    const id = req.params.id;
    const pieza = await Pieza.findByIdAndDelete(id);
    res.redirect('/piezas');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error interno del servidor');
  }
};

export const deletePieza = async (req, res) => {
  try {
    const id = req.params.id;
    const pieza = await Pieza.findById(id);
    if (pieza && pieza.cantidad > 0) {
      pieza.cantidad -= 1;
      await pieza.save();
    }
    res.redirect('/piezas');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error interno del servidor');
  }
};

export const EliminarPieza = async (req, res) => {
  await Pieza.findByIdAndDelete(req.params.id);
  res.redirect("/piezas");
};


/*app.get('/piezas', async (req, res) => {
  try {
    const piezas = await Pieza.find().lean();
    res.render('/piezas/all-piezas', { piezas, });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error interno del servidor');
  }
});


app.post('/agregar', async (req, res) => {
  try {
    const { nombre, cantidad, precio } = req.body;
    const piezaExistente = await Pieza.findOne({ nombre });
    if (piezaExistente) {
      piezaExistente.cantidad += parseInt(cantidad);
      await piezaExistente.save();
    } else {
      await Pieza.create({ nombre, cantidad, precio });
    }
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error interno del servidor');
  }
});


app.post('/eliminar/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const pieza = await Pieza.findById(id);
    if (pieza && pieza.cantidad > 0) {
      pieza.cantidad -= 1;
      await pieza.save();
    }
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error interno del servidor');
  }
});

app.get('/actualizar/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const pieza = await Pieza.findById(id);
    if (pieza) {
      pieza.cantidad += 1;
      await pieza.save();
    }
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error interno del servidor');
  }
});

app.post('/eliminar/id/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const pieza = await Pieza.findByIdAndDelete(id);
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error interno del servidor');
  }
});*/