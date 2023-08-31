const Product = require("../models/product");
const Order = require("../models/order");
const fs = require("fs");
const path = require("path");
const pdfDocument = require("pdfkit");
const stripe = require("stripe")(
  "sk_test_51NdNCAEG2kmqy3fqRU4ORkJgbwMBveOtkYeGwVdCoib6nrBNuucwumAZSIR7VmLElRGnsLRmlJwGfoCOyFKBBKp800dJtpGL7g"
);

const ITEM_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
  const page = req.query.page || 1;
  let totalProducts;
  Product.find()
    .countDocuments()
    .then((numberProducts) => {
      totalProducts = numberProducts;
      return Product.find()
        .skip((page - 1) * ITEM_PER_PAGE)
        .limit(ITEM_PER_PAGE)
        .then((products) => {
          console.log(products);
          res.render("shop/product-list", {
            prods: products,
            pageTitle: "All Products",
            path: "/products",
            currentPage: page,
            hasNextPage: Math.ceil(totalProducts / ITEM_PER_PAGE) < page,
            hasPreviousPage: page > 1,
            nextPage: +page + 1,
            previousPage: +page - 1,
            lastPage: Math.ceil(totalProducts / ITEM_PER_PAGE),
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

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(err);
    });
};

exports.getIndex = (req, res, next) => {
  let page = req.query.page;
  if (page === undefined) {
    page = 1;
  }
  let totalProducts;
  Product.find()
    .countDocuments()
    .then((numberProducts) => {
      totalProducts = numberProducts;
      return Product.find()
        .skip((page - 1) * ITEM_PER_PAGE)
        .limit(ITEM_PER_PAGE)
        .then((products) => {
          res.render("shop/index", {
            prods: products,
            pageTitle: "Shop",
            path: "/",
            currentPage: page,
            hasNextPage: Math.ceil(totalProducts / ITEM_PER_PAGE) < page,
            hasPreviousPage: page > 1,
            nextPage: +page + 1,
            previousPage: +page - 1,
            lastPage: Math.ceil(totalProducts / ITEM_PER_PAGE),
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

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
      });
    })
    .catch((err) => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(err);
    });
};

exports.getCheckout = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      let total = 0;
      products.forEach((p) => {
        total += p.productId.price * p.quantity;
      });
      return stripe.checkout.sessions
        .create({
          line_items: products.map((p) => {
            return {
              quantity: p.quantity,
              price_data: {
                currency: "cad",
                unit_amount: p.productId.price * 100,
                product_data: {
                  name: p.productId.title,
                  description: p.productId.description,
                },
              },
            };
          }),
          mode: "payment",
          payment_method_types: ["card"],
          success_url:
            req.protocol + "://" + req.get("host") + "/checkout/success",
          cancel_url:
            req.protocol + "://" + req.get("host") + "/checkout/cancel",
        })
        .then((session) => {
          res.render("shop/checkout", {
            path: "/checkouts",
            pageTitle: "Checkout",
            products: products,
            total: total,
            sessionId: session.id,
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

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      console.log(result);
      res.redirect("/cart");
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(err);
    });
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          name: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(err);
    });
};

exports.getCheckoutSuccess = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          name: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(err);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
      });
    })
    .catch((err) => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(err);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;

  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        throw new Error("The order doesn't exist");
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        throw new Error("Unauthorized");
      }
      const fileName = "invoice-" + orderId + ".pdf";
      const filePath = path.join("data", "Invoices", fileName);
      // fs.readFile(filePath, (err, data) => {
      //   if (err) {
      //     next(err);
      //   }
      //   res.setHeader("Content-Type", "application/pdf");
      //   res.setHeader(
      //     "Content-Disposition",
      //     'inline; filename="' + fileName + '"'
      //   );
      //   res.send(data);
      // });
      // const file = fs.createReadStream(filePath);
      // res.setHeader("Content-Type", "application/pdf");
      // res.setHeader(
      //   "Content-Disposition",
      //   'inline; filename="' + fileName + '"'
      // );
      // file.pipe(res);
      const pdfDoc = new pdfDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'inline; filename="' + fileName + '"'
      );
      pdfDoc.pipe(fs.createWriteStream(filePath));
      pdfDoc.pipe(res);
      pdfDoc.fontSize(26).text("Invoice", {
        underline: true,
      });
      pdfDoc.fontSize(14).text("----------------------------");
      let total = 0;
      order.products.forEach((prod) => {
        pdfDoc.text(
          `${prod.product.title} - ${prod.quantity} x $${prod.product.price}`
        );
        total += prod.quantity * prod.product.price;
      });
      pdfDoc.text("-----------------");
      pdfDoc.fontSize(20).text(`Total: $${total}`);
      pdfDoc.end();
    })
    .catch((err) => {
      throw new Error(err);
    });
};
