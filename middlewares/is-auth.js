module.exports = (req, res, next) => {
  if (req.session.user === undefined || req.session.user === null) {
    return res.redirect("/login");
  }
  next();
};
