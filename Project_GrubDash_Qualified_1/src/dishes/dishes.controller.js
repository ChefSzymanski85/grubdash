const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /dishes handlers needed to make the tests pass

// middleware to see if dish exists
function dishExists(req, res, next) {
  const dishId = req.params.dishId;
  const foundDish = dishes.find((dish) => dish.id === dishId);
  if (foundDish) {
    res.locals.dish = foundDish;
    return next();
  } else {
    return next({
      status: 404,
      message: `Dish id not found ${req.params.dishId}`,
    });
  }
}

// validate dish fields
function isValidDish(req, res, next) {
  const requiredFields = ["name", "description", "price", "image_url"];
  for (const field of requiredFields) {
    if (!req.body.data[field]) {
      next({
        status: 400,
        message: `Dish must include a ${field}`,
      });
      return;
    }
  }

  if (req.body.data.price < 0) {
    return next({
      status: 400,
      message: "Field 'price' must be above zero",
    });
  }

  next();
}

function list(req, res, next) {
  res.json({ data: dishes });
}

function create(req, res, next) {
  const { data: { name, price, description, image_url } = {} } = req.body;
  const newDish = {
    id: nextId(), // use pre-made function to give a new id to new dish
    name,
    price,
    description,
    image_url,
  };
  dishes.push(newDish);
  res.status(201).json({ data: newDish });
}

function read(req, res, next) {
  res.json({ data: res.locals.dish });
}

function update(req, res, next) {
  const dishId = req.params.dishId;
  const foundDish = dishes.find((dish) => dish.id === dishId);

  const { data: { id, name, price, description, image_url } = {} } = req.body;

  // return error if current dish id does not match updated dish id
  if (id && id !== dishId) {
    return next({
      status: 400,
      message: `id${id} does not match ${dishId}`,
    });
  }

  // return error if price is not a number
  if (typeof price !== "number") {
    return next({
      status: 400,
      message: `price must be a number`,
    });
  }

  foundDish.name = name;
  foundDish.price = price;
  foundDish.description = description;
  foundDish.image_url = image_url;

  res.json({ data: foundDish });
}

module.exports = {
  list,
  create: [isValidDish, create],
  read: [dishExists, read],
  update: [dishExists, isValidDish, update],
};
