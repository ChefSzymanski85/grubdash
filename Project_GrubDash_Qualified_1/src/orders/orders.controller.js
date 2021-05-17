const path = require("path");
const { PassThrough } = require("stream");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass

// middleware to see if order exists
function orderExists(req, res, next) {
  const orderId = req.params.orderId;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  } else {
    return next({
      status: 404,
      message: `Order id not found ${req.params.orderId}`,
    });
  }
}

// validate order fields
function isValidOrder(req, res, next) {
  const orderBody = req.body.data;
  const orderDishes = orderBody.dishes;
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

  // return an error if dishes are not an array
  if (Array.isArray(orderDishes) === false) {
    return next({
      status: 400,
      message: "dish must be an array",
    });
  }

  // return an error if the dishes array is empty
  if (orderDishes < 1) {
    return next({
      status: 400,
      message: "There are no dishes in your cart",
    });
  }

  // return an error if dish quantity is < 1 or not an integer
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

function list(req, res, next) {
  res.json({ data: orders });
}

function create(req, res, next) {
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

function read(req, res, next) {
  res.json({ data: res.locals.order });
}

function update(req, res, next) {
  const orderId = req.params.orderId;
  const foundOrder = orders.find((order) => order.id === orderId);

  const { data: { id, deliverTo, mobileNumber, status, dishes } = {} } =
    req.body;

  // return error if current order id does not match updated order id
  if (id && id !== orderId) {
    return next({
      status: 400,
      message: `id${id} does not match ${orderId}`,
    });
  }

  // return error if status is invalid or doesn't exist
  if (!status || status === "invalid") {
    return next({
      status: 400,
      message: "order status is invalid",
    });
  }

  foundOrder.deliverTo = deliverTo;
  foundOrder.mobileNumber = mobileNumber;
  foundOrder.status = status;
  foundOrder.dishes = dishes;

  res.json({ data: foundOrder });
}

function destroy(req, res, next) {
  const orderId = req.params.orderId;
  // find index of order to delete
  const index = orders.findIndex((order) => order.id === orderId);

  // find order status
  const findOrder = orders.find((order) => order.id === orderId);
  const orderStatus = findOrder.status;

  // return error if order status is not pending
  if (orderStatus !== "pending") {
    return next({
      status: 400,
      message: "order status is not pending",
    });
  }

  // splice returns an array of the deleted elements, even if it is one element
  if (index > -1) {
    orders.splice(index, 1);
  }
  res.sendStatus(204);
}

module.exports = {
  list,
  create: [isValidOrder, create],
  read: [orderExists, read],
  update: [orderExists, isValidOrder, update],
  delete: [orderExists, destroy],
};
