import express from "express";
import exphbs from "express-handlebars";
import session from "express-session";
import methodOverride from "method-override";
import flash from "connect-flash";
import bodyParser from "body-parser";
import passport from "passport";
import morgan from "morgan";
import MongoStore from "connect-mongo";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { MONGODB_URI, PORT } from "./config.js";
import indexRoutes from "./routes/index.routes.js";
import notesRoutes from "./routes/notes.routes.js";
import piezasRoutes from "./routes/piezas.routes.js";
import userRoutes from "./routes/auth.routes.js";
import "./config/passport.js";

// Initializations
const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

// settings
app.set("port", PORT);
app.set("views", join(__dirname, "views"));

// config view engine
const hbs = exphbs.create({

  defaultLayout: "main",
  layoutsDir: join(app.get("views"), "layouts"),
  partialsDir: join(app.get("views"), "partials"),
  extname: ".hbs",
  helpers: {
    eq: function (a, b) {
      return a === b;
    }
  }
});
app.engine(".hbs", hbs.engine);
app.set("view engine", ".hbs");
app.use(bodyParser.urlencoded({ extended: true }));

// middlewares
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride("_method"));
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: MONGODB_URI }),
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Global Variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  res.locals.user = req.user || null;
  res.locals.breadcrumbs = req.session.breadcrumbs || [];

  next();
});

// Objeto que mapea las rutas a sus nombres
const rutaNombreMap = {
  '/': 'Inicio',
  '/about': 'Sobre nosotros',
  '/notes': 'Todas las ordenes',
  '/notes/add': 'Nueva orden',
  '/servicios/marketing-digital': 'Marketing',
  '/servicios/disenio-ui-ux': 'Diseño UIX',
  '/servicios/disenio-de-aplicaciones': 'Diseño de Aplicaciones',
  '/servicios/pensamiento-digital': 'Pensamiento Digital',
  '/servicios/Transformacion-Digital': 'Transformacion Digital',
  '/servicios/Desarrollo-Web': 'Desarrollo Web',
  '/auth/signup': 'Registrarse',
  '/auth/signin': 'Iniciar sesión',
  '/Mapa':'Mapa del sitio'
  // Agrega más rutas y nombres según sea necesario
};

// Middleware para actualizar los breadcrumbs
function actualizarBreadcrumbs(req, res, next) {
  let breadcrumbs = req.session.breadcrumbs || [];

  // Obtener la ruta actual y su nombre correspondiente
  const rutaActual = req.originalUrl;
  const nombreRuta = rutaNombreMap[rutaActual] || 'Nombre Desconocido';

  // Limpiar los breadcrumbs si la ruta actual es la página de inicio
  if (rutaActual === '/') {
    breadcrumbs = [];
  }
  // Verificar si el nombre de la ruta es diferente de 'Nombre Desconocido'
  if (nombreRuta !== 'Nombre Desconocido') {
    // Verificar si la ruta actual ya está en los breadcrumbs
    const index = breadcrumbs.findIndex(crumb => crumb.url === rutaActual);
    if (index !== -1) {
      // Si la ruta ya está en los breadcrumbs, eliminar todas las migas de pan después de esta ruta
      breadcrumbs = breadcrumbs.slice(0, index);
    }

    // Agregar la miga de pan solo si el nombre de la ruta no es 'Nombre Desconocido'
    breadcrumbs.push({ url: rutaActual, name: nombreRuta });
  }

  // Actualizar la lista de breadcrumbs en la sesión
  req.session.breadcrumbs = breadcrumbs;
  next();
}
// Utiliza el middleware de actualización de breadcrumbs en todas las solicitudes
app.use(actualizarBreadcrumbs);
app.get('/search', (req, res) => {
  const query = req.query.q.toLowerCase().replace(/\s/g, ''); // Convertir la consulta a minúsculas y eliminar espacios en blanco

  // Diccionario de palabras clave y rutas correspondientes
  const keywords = {
    'marketing': '/servicios/marketing-digital',
    'diseño': '/servicios/disenio-ui-ux',
    'aplicaciones': '/servicios/disenio-de-aplicaciones',
    'nuevaorden': '/notes/add', 
    'pensamiento': '/servicios/pensamiento-digital', 
    'transformacion': '/servicios/Transformacion-Digital', 
    'desarrollo': '/servicios/Desarrollo-Web', 
    'registrarse': '/auth/signup',
    'iniciarsesión': '/auth/signin', 
    'marketing': '/servicios/marketing-digital', 
    'diseñoui/ux': '/servicios/disenio-ui-ux', 
    'diseñodeaplicaciones': '/servicios/disenio-de-aplicaciones', 
    'desarrolloweb':'/servicios/Desarrollo-Web', 
    'nuevaorden': '/notes/add',
    'pensamientodigital':'/servicios/pensamiento-digital', 
    'transformacióndigital': '/servicios/Transformacion-Digital',
    'registrarse': '/auth/signup', 
    'iniciarsesión': '/auth/signin',
    'mapadelsitio':'/Mapa',
    'mapa del sitio':'/Mapa',
    'mapa':'/Mapa'
  };

  // Buscar la palabra clave en el diccionario
  const destination = keywords[query];

  // Si se encuentra la palabra clave, redirigir a la ruta correspondiente
  if (destination) {
    res.redirect(destination);
  } else {
    res.redirect('/'); // Redirigir a la página de inicio si la palabra clave no se encuentra
  }
});


// routes
app.use(indexRoutes);
app.use(userRoutes);
app.use(notesRoutes);
app.use(piezasRoutes);

// static files
app.use(express.static(join(__dirname, "public")));

app.use((req, res, next) => {
  return res.status(404).render("404");
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.render("error", {
    error,
  });
});

export default app;
