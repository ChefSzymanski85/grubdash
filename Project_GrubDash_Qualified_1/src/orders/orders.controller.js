const path = require("path");
const { PassThrough } = require("stream");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

//-------------------------------Middleware functions--------------------------

// check to see if order exists
function orderExists(req, res, next) {
  const orderId = req.params.orderId;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    res.locals.orderId = orderId;
    return next();
  }
  return next({
    status: 404,
    message: `Order id not found ${req.params.orderId}`,
  });
}

// validate order fields
function isValidOrder(req, res, next) {
  const orderBody = req.body.data;
  const requiredFields = ["deliverTo", "mobileNumber", "dishes"];
  for (const field of requiredFields) {
    if (!orderBody[field]) {
      next({
        status: 400,
        message: `Order must include a ${field}`,
      });
      return;
    }
  }
  next();
}

// return an error if dishes are not an array or are an empty array
function isValidArray(req, res, next) {
  const orderDishes = req.body.data.dishes;
  if (Array.isArray(orderDishes) === false || orderDishes < 1) {
    return next({
      status: 400,
      message: "There are no dishes in your cart",
    });
  }
  next();
}

// return an error if dish quantity is < 1 or not an integer
function isValidQuantity(req, res, next) {
  const orderDishes = req.body.data.dishes;
  orderDishes.map((dish) => {
    const dishQuantity = dish.quantity;
    if (typeof dishQuantity !== "number" || dishQuantity < 1) {
      return next({
        status: 400,
        message: `Dish quantity must be 1, 2, or more. Quantity entered: ${dishQuantity}`,
      });
    }
    return;
  });
  next();
}

// return error if current order id does not match updated order id
function isValidId(req, res, next) {
  if (req.body.data.id && req.body.data.id !== res.locals.orderId) {
    return next({
      status: 400,
      message: `id ${req.body.data.id} does not match ${res.locals.orderId}`,
    });
  }

  next();
}

// return error if status is invalid or doesn't exist
function isValidStatus(req, res, next) {
  if (!req.body.data.status || req.body.data.status === "invalid") {
    return next({
      status: 400,
      message: "order status is invalid",
    });
  }
  next();
}

// return error if order status is not pending
function isPending(req, res, next) {
  if (res.locals.order.status !== "pending") {
    return next({
      status: 400,
      message: "order status is not pending",
    });
  }
  next();
}

//------------------------------CRUD functions-----------------------------------

function list(req, res) {
  res.json({ data: orders });
}

function create(req, res) {
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;
  const newOrder = {
    id: nextId(), // use pre-made function to give a new id to new order
    deliverTo,
    mobileNumber,
    status,
    dishes,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function read(req, res) {
  res.json({ data: res.locals.order });
}

function update(req, res) {
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;

  res.locals.order.deliverTo = deliverTo;
  res.locals.order.mobileNumber = mobileNumber;
  res.locals.order.status = status;
  res.locals.order.dishes = dishes;

  res.json({ data: res.locals.order });
}

function destroy(req, res) {
  // find index of order to delete
  const index = orders.findIndex((order) => order.id === res.locals.orderId);
  // splice returns an array of the deleted elements, even if it is one element
  orders.splice(index, 1);
  res.sendStatus(204);
}

module.exports = {
  list,
  create: [isValidOrder, isValidArray, isValidQuantity, create],
  read: [orderExists, read],
  update: [
    orderExists,
    isValidOrder,
    isValidArray,
    isValidQuantity,
    isValidId,
    isValidStatus,
    update,
  ],
  delete: [orderExists, isPending, destroy],
};
