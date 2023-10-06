const express = require("express");
let cookieSession = require('cookie-session');
const bcrypt = require("bcryptjs");
const getUserByEmail = require('./helpers');

const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: ['jkasdhfjka'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

function generateRandomString() {
  return Math.random().toString(36).substring(2, 8);
}

const users = {};

const urlDatabase = {};



const urlsForUser = function(id) {
  const userURLs = {};
  for (const key in urlDatabase) {
    if (id === urlDatabase[key].userID) {
      userURLs[key] = urlDatabase[key].longURL;
    }
  }
  return userURLs;
};

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls", (req, res) => {
  if (req.session.user_id === undefined) {
    res.status(401).send("<html><body>Must log in order to display URLs</body></html>\n");
    return;
  }
  const id = req.session.user_id;
  const user = users[id];
  const urlData = urlsForUser(id);
  console.log(user);
  const templateVars = { user, urls: urlData };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  if (req.session.user_id === undefined) {
    res.redirect(`/login`);
    return;
  }
  const user = users[req.session.user_id];
  const templateVars = { user };
  res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  const id = req.params.id;
  if (urlDatabase[id] === undefined) {
    res.status(404).send(`<html><body>Shortened URL ${id} does not exist</body></html>\n`);
    return;
  }
  const userID = req.session.user_id;
  if (userID === undefined) {
    res.status(403).send(`<html><body>Must log in to access individual URL pages</body></html>\n`);
    return;
  }
  const urlData = urlsForUser(userID);
  if (urlData[id] === undefined) {
    res.status(403).send(`<html><body>Shortened URL ${id} is forbidden</body></html>\n`);
    return;
  }
  const user = users[userID];
  const templateVars = { user, id: req.params.id, longURL: urlDatabase[req.params.id].longURL };
  res.render("urls_show", templateVars);
});

app.get("/register", (req, res) => {
  if (req.session.user_id !== undefined) {
    res.redirect(`/urls`);
    return;
  }
  const user = users[req.session.user_id];
  const templateVars = { user };
  res.render("register", templateVars);
});

app.get("/login", (req, res) => {
  if (req.session.user_id !== undefined) {
    res.redirect(`/urls`);
    return;
  }
  const user = users[req.session.user_id];
  const templateVars = { user };
  res.render("login", templateVars);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

app.post("/urls", (req, res) => {
  if (req.session.user_id === undefined) {
    res.send("<html><body>Only registered users can shorten urls</body></html>\n");
    return;
  }
  const longURL = req.body.longURL;
  const id = generateRandomString();
  urlDatabase[id] = {
    longURL: longURL,
    userID: req.session.user_id
  }
  res.redirect(`/urls/${id}`);
});

app.get("/u/:id", (req, res) => {
  const id = req.params.id;
  if (urlDatabase[id] === undefined) {
    res.status(404).send(`<html><body>Shortened URL ${id} does not exist</body></html>\n`);
    return;
  }
  const longURL = urlDatabase[id].longURL;
  res.redirect(longURL);
});

app.post("/urls/:id/delete", (req, res) => {
  const userID = req.session.user_id;
  const id = req.params.id;
  console.log(userID);
  if (userID === 'undefined' || userID === undefined) {
    console.log(userID);
    res.status(401).send(`Must log in order to delete URL\n`);
    return;
  }
  if (urlDatabase[id] === undefined) {
    res.status(404).send("URL does not exist\n");
    return;
  }
  const urlData = urlsForUser(userID);
  if (urlData[id] === undefined) {
    res.status(403).send("No permission to delete URL\n");
    return;
  }
  delete urlDatabase[id];
  res.redirect('/urls');
});

app.post("/urls/:id", (req, res) => {
  const userID = req.session.user_id;
  const id = req.params.id;
  if (userID === 'undefined' || userID === undefined) {
    res.status(401).send("Must log in order to edit URL\n");
    return;
  }
  if (urlDatabase[id] === undefined) {
    res.status(404).send("URL does not exist\n");
    return;
  }
  const urlData = urlsForUser(userID);
  if (urlData[id] === undefined) {
    res.status(403).send("No permission to edit URL\n");
    return;
  }
  const longURL = req.body.longURL;
  urlDatabase[id].longURL = longURL;
  res.redirect(`/urls`);
});

app.post("/urls/:id/redirect", (req, res) => {
  const id = req.params.id;
  res.redirect(`/urls/${id}`);
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = getUserByEmail(email, users);
  if (!user) {
    res.status(403).send("<html><body>User with the email cannot be found</body></html>");
    return;
  }
  if (!bcrypt.compareSync(password, user.password)) {
    res.status(403).send("<html><body>Invalid password</body></html>");
    return;
  }
  req.session.user_id = user.id;
  res.redirect(`/urls`);
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect(`/login`);
});

app.post("/register", (req, res) => {
  const id = generateRandomString();
  const { email, password } = req.body;
  if (getUserByEmail(email, users)) {
    res.status(400).send('<html><body>Email already exists</body></html>');
    return;
  }
  if (email === "" || password === "") {
    res.status(400).send("<html><body>Fill in email/password</body></html>");
    return;
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  users[id] = { id, email, password: hashedPassword };
  req.session.user_id = id;
  console.log(users);

  res.redirect(`/urls`);
});