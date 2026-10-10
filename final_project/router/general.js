const express = require('express');
const axios = require('axios');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();

const BASE_URL = "http://localhost:5000";

// Wrap the in-memory lookups in Promises so they behave like async data access
const getBooks = () => new Promise((resolve) => resolve(books));

const findBy = (field, value) => new Promise((resolve, reject) => {
  const matches = Object.keys(books)
    .filter((isbn) => books[isbn][field].toLowerCase() === value.toLowerCase())
    .map((isbn) => ({ isbn, ...books[isbn] }));
  if (matches.length > 0) resolve(matches);
  else reject(new Error("No books found for " + field + ": " + value));
});

// Register a new user
public_users.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }
  if (!isValid(username)) {
    return res.status(409).json({ message: "User already exists or username is invalid" });
  }
  users.push({ username, password });
  return res.status(200).json({ message: "User successfully registered. Now you can login" });
});

// Get all books (async/await)
public_users.get('/', async (req, res) => {
  const allBooks = await getBooks();
  return res.status(200).send(JSON.stringify(allBooks, null, 4));
});

// Get book by ISBN (Promise)
public_users.get('/isbn/:isbn', (req, res) => {
  const isbn = req.params.isbn;
  new Promise((resolve, reject) => {
    if (books[isbn]) resolve(books[isbn]);
    else reject(new Error("Book with ISBN " + isbn + " not found"));
  })
    .then((book) => res.status(200).send(JSON.stringify(book, null, 4)))
    .catch((err) => res.status(404).json({ message: err.message }));
});

// Get books by author (Promise)
public_users.get('/author/:author', (req, res) => {
  findBy("author", req.params.author)
    .then((found) => res.status(200).send(JSON.stringify({ booksbyauthor: found }, null, 4)))
    .catch((err) => res.status(404).json({ message: err.message }));
});

// Get books by title (Promise)
public_users.get('/title/:title', (req, res) => {
  findBy("title", req.params.title)
    .then((found) => res.status(200).send(JSON.stringify({ booksbytitle: found }, null, 4)))
    .catch((err) => res.status(404).json({ message: err.message }));
});

// Get book reviews
public_users.get('/review/:isbn', (req, res) => {
  const isbn = req.params.isbn;
  if (!books[isbn]) {
    return res.status(404).json({ message: "Book with ISBN " + isbn + " not found" });
  }
  return res.status(200).send(JSON.stringify(books[isbn].reviews, null, 4));
});

/* ------------------------------------------------------------------
   Axios clients (async/await or Promises) for the four general-user
   operations. They call this server's own endpoints, so the server
   must be running (node index.js) when they are used.
   ------------------------------------------------------------------ */

// 1. Get all books - async/await with Axios
const getAllBooks = async () => {
  try {
    const response = await axios.get(BASE_URL + "/");
    console.log("All books:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching books:", error.message);
  }
};

// 2. Search by ISBN - Promises with Axios
const getBookByISBN = (isbn) => {
  return axios.get(BASE_URL + "/isbn/" + encodeURIComponent(isbn))
    .then((response) => {
      console.log("Book with ISBN " + isbn + ":", response.data);
      return response.data;
    })
    .catch((error) => console.error("Error fetching ISBN " + isbn + ":", error.message));
};

// 3. Search by author - Promises with Axios
const getBooksByAuthor = (author) => {
  return axios.get(BASE_URL + "/author/" + encodeURIComponent(author))
    .then((response) => {
      console.log("Books by " + author + ":", response.data);
      return response.data;
    })
    .catch((error) => console.error("Error fetching author " + author + ":", error.message));
};

// 4. Search by title - async/await with Axios
const getBooksByTitle = async (title) => {
  try {
    const response = await axios.get(BASE_URL + "/title/" + encodeURIComponent(title));
    console.log("Books titled " + title + ":", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching title " + title + ":", error.message);
  }
};

module.exports.general = public_users;
module.exports.getAllBooks = getAllBooks;
module.exports.getBookByISBN = getBookByISBN;
module.exports.getBooksByAuthor = getBooksByAuthor;
module.exports.getBooksByTitle = getBooksByTitle;