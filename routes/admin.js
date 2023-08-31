const path = require("path");
const { body } = require("express-validator");

const express = require("express");

const adminController = require("../controllers/admin");

const router = express.Router();

const isAuth = require("../middlewares/is-auth");

// /admin/add-product => GET
router.get("/add-product", isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get("/products", isAuth, adminController.getProducts);

// /admin/add-product => POST
router.post(
  "/add-product",
  [
    body("title").trim().not().isEmpty().withMessage("Please input title"),
    body("price")
      .trim()
      .isFloat({ min: 0 })
      .withMessage("Price need to be a positive number"),
    body("description")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Please input description"),
  ],
  isAuth,
  adminController.postAddProduct
);

router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);

router.post(
  "/edit-product",
  isAuth,
  [
    body("title").trim().not().isEmpty().withMessage("Please input title"),
    body("price")
      .trim()
      .isFloat({ min: 0 })
      .withMessage("Price need to be a positive number"),
    body("description")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Please input description"),
  ],
  adminController.postEditProduct
);

router.delete("/product/:productId", isAuth, adminController.deleteProduct);

module.exports = router;
