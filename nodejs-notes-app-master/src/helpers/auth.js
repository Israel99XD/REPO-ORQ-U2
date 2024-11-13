export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated() && (req.user.rol === 'user' || req.user.rol === 'admin' || req.user.rol === 'almacen')) {
    return next();
  }
  req.flash("error_msg", "No estas autorizado. Crea una cuenta o inicia sesión");
  res.redirect("/users/signin");
};
