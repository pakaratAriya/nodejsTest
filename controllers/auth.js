const User = require("../models/user");
const bcryptjs = require("bcryptjs");
const crypto = require("crypto");
const { validationResult } = require("express-validator");

const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "pakarat.sendmail@gmail.com",
    pass: "mumymsdcjthrnenl",
  },
});

exports.getLogin = (req, res, next) => {
  const errorObj = req.flash("error");
  const successObj = req.flash("success");
  let errorMessage = null;
  let successMessage = null;
  if (errorObj && errorObj.length > 0) {
    errorMessage = errorObj[0];
  } else if (successObj && successObj.length > 0) {
    successMessage = successObj[0];
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: errorMessage,
    successMessage: successMessage,
    data: {
      email: "",
      password: "",
    },
    validationErrors: [],
  });
};

exports.getSignup = (req, res, next) => {
  const errorObj = req.flash("error");

  let errorMessage = null;
  if (errorObj && errorObj.length > 0) {
    errorMessage = errorObj[0];
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: errorMessage,
    data: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationErrors: [],
  });
};

exports.getReset = (req, res, next) => {
  const errorObj = req.flash("error");
  let errorMessage = null;
  if (errorObj !== undefined && errorObj.length > 0) {
    errorMessage = errorObj[0];
  }
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: errorMessage,
  });
};

exports.getNewPassword = (req, res, next) => {
  const errorMessage = null;
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then((user) => {
      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "Reset Password",
        errorMessage: errorMessage,
        userId: user._id,
        resetToken: token,
      });
    })
    .catch((err) => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(err);
    });
};

exports.postNewpassword = (req, res, next) => {
  const resetToken = req.body.resetToken;
  const userId = req.body.userId;
  const newPassword = req.body.password;
  let user;
  User.findOne({
    _id: userId,
    resetToken: resetToken,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((u) => {
      user = u;
      return bcryptjs.hash(newPassword, 12);
    })
    .then((hashedPassword) => {
      user.password = hashedPassword;
      user.resetToken = null;
      user.resetTokenExpiration = null;
      return user.save();
    })
    .then((result) => {
      res.redirect("/login");
    })

    .catch((err) => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(err);
    });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash(
            "error",
            "The email doesn't exist. Please signup a new account."
          );
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 36000000;
        return user.save();
      })
      .then((result) => {
        transporter.sendMail({
          to: req.body.email,
          from: "pakarat.sendmail@gmail.com",
          subject: "reset password",
          html: `
            <p>You requested a password reset</p>
            <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password</p>
          `,
        });
        res.redirect("/");
      })
      .catch((err) => {
        console.log(err);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(err);
      });
  });
};

exports.postLogin = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      data: {
        email: req.body.email,
        password: req.body.password,
      },
      validationErrors: errors.array(),
    });
  }
  return User.findOne({ email: req.body.email })
    .then((user) => {
      if (!user) {
        return res.render("auth/login", {
          path: "/login",
          pageTitle: "Login",
          errorMessage: "Invalid email or password",
          data: {
            email: req.body.email,
            password: req.body.password,
          },
          validationErrors: [],
        });
      }
      return bcryptjs
        .compare(req.body.password, user.password)
        .then((doMatch) => {
          console.log(doMatch);
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save((err) => {
              console.log(err);
              console.log("loging in");
              res.redirect("/");
            });
          }
          return res.render("auth/login", {
            path: "/login",
            pageTitle: "Login",
            errorMessage: "Invalid email or password",
            data: {
              email: req.body.email,
              password: req.body.password,
            },
            validationErrors: [],
          });
        });
    })
    .catch((err) => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(err);
    });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      data: {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
      },
      validationErrors: errors.array(),
    });
  }
  return User.findOne({ email: email })
    .then((userDoc) => {
      if (userDoc) {
        req.flash(
          "error",
          "The email has already existed please pick a different email"
        );
        return res.redirect("/signup");
      }
      return bcryptjs
        .hash(password, 12)
        .then((hashedPassword) => {
          const newUser = new User({
            email: email,
            password: hashedPassword,
            cart: { items: [] },
          });
          return newUser.save();
        })
        .then((result) => {
          req.flash("success", "signup seccuessfully");
          transporter.sendMail(
            {
              to: email,
              from: "pakarat.sendmail@gmail.com",
              subject: "Signup succeeded",
              html: "<h1>You successfully signed up</h1>",
            },
            (err, info) => {
              if (err) {
                console.log(err);
              }
            }
          );
          res.redirect("/login");
        });
    })
    .catch((err) => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(err);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};
