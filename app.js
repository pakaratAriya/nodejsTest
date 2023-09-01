const path = require("path");

const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const helmet = require("helmet");
const compression = require("compression");
const MongoDBStore = require("connect-mongodb-session")(session);

const csrf = require("csurf");

const csrfProtection = csrf();

const flash = require("connect-flash");

const errorController = require("./controllers/error");
const User = require("./models/user");

const DB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.d1oeb6n.mongodb.net/${process.env.MONGO_DB_NAME}`;
const app = express();
const store = new MongoDBStore({
  uri: DB_URI,
  collection: "session",
});

app.set("view engine", "ejs");
app.set("views", "views");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");
const { compress } = require("pdfkit");

app.use(helmet());
app.use(compression());

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${new Date().toISOString().replaceAll(":", "-")}-${file.originalname}`
    );
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  multer({ storage: multerStorage, fileFilter: fileFilter }).single("image")
);
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);
app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      next(err);
    });
});

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(errorController.get404);

app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).render("500", {
    pageTitle: "Error",
    path: "/500",
    isAuthenticated: req.session && req.session.isLoggedIn,
  });
});

mongoose
  .connect(DB_URI)
  .then((result) => {
    app.listen(process.env.PORT || 3030);
  })
  .catch((err) => {
    console.log(err);
  });
