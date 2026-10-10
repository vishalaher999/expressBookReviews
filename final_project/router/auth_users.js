const express = require('express');
const jwt = require('jsonwebtoken');
let books = require("./booksdb.js");
const regd_users = express.Router();

let users = [];

// A username is valid if it is a non-empty string not already taken
const isValid = (username) => {
  return typeof username === 'string' && username.trim() !== '' &&
    !users.some((user) => user.username === username);
};

const authenticatedUser = (username, password) => {
  return users.some((user) => user.username === username && user.password === password);
};

// Login: only registered users
regd_users.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }
  if (!authenticatedUser(username, password)) {
    return res.status(401).json({ message: "Invalid login. Check username and password" });
  }
  const accessToken = jwt.sign({ data: password }, 'access', { expiresIn: 60 * 60 });
  req.session.authorization = { accessToken, username };
  return res.status(200).send("User successfully logged in");
});

// Add or modify a review (review text in the query string; one review per user per book)
regd_users.put("/auth/review/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  const review = req.query.review;
  const username = req.session.authorization.username;
  if (!books[isbn]) {
    return res.status(404).json({ message: "Book with ISBN " + isbn + " not found" });
  }
  if (!review) {
    return res.status(400).json({ message: "Review text is required (?review=...)" });
  }
  const existed = books[isbn].reviews[username] !== undefined;
  books[isbn].reviews[username] = review;
  return res.status(200).json({
    message: "Review for book with ISBN " + isbn + (existed ? " modified" : " added") + " successfully",
    reviews: books[isbn].reviews
  });
});

// Delete the logged-in user's own review only
regd_users.delete("/auth/review/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  const username = req.session.authorization.username;
  if (!books[isbn]) {
    return res.status(404).json({ message: "Book with ISBN " + isbn + " not found" });
  }
  if (books[isbn].reviews[username] === undefined) {
    return res.status(404).json({ message: "No review by " + username + " for ISBN " + isbn });
  }
  delete books[isbn].reviews[username];
  return res.status(200).json({
    message: "Review for the ISBN " + isbn + " posted by the user " + username + " deleted.",
    reviews: books[isbn].reviews
  });
});

module.exports.authenticated = regd_users;
module.exports.isValid = isValid;
module.exports.users = users;