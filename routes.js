const express = require("express");
const session = require("express-session");
const path = require("path");
const bodyParser = require("body-parser");
const { checkPlayerInDatabase } = require("./auth");
const { Joueur, Partie, Score } = require("./database");
const router = express.Router();

router.use(express.static(path.join(__dirname, "public")));
router.use(bodyParser.json());

// Configuration de la session
router.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: false,
  })
);

router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "index.html"));
});

router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "connexion.html"));
});

router.post("/login", async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const result = await checkPlayerInDatabase(username, password);
    if (result.message === "Connexion réussie !" || "Inscription réussie !") {
      // Stocker les informations d'identification de l'utilisateur dans la session
      req.session.username = username;
      res.status(200).json(result);
    } else {
      res.status(401).json(result); // Unauthorized
    }
  } catch (error) {
    next(error);
  }
});

router.get("/game", (req, res) => {
  // Vérifier si l'utilisateur est authentifié en consultant la session
  if (req.session.username) {
    res.sendFile(path.join(__dirname, "public", "html", "game.html"));
  } else {
    res.redirect("/login");
  }
});

router.get("/scores", async (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "scores.html"));
});

router.get("/individual-scores", async (req, res) => {
  try {
    const scores = await Score.find({}, { _id: 0, __v: 0 });
    res.json(scores);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des scores individuels :",
      error
    );
    res
      .status(500)
      .send("Erreur lors de la récupération des scores individuels");
  }
});

router.get("/game-scores", async (req, res) => {
  try {
    const scores = await Partie.find().sort({ date: -1 }).limit(10);
    res.json(scores);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des scores de partie :",
      error
    );
    res.status(500).send("Erreur lors de la récupération des scores de partie");
  }
});

module.exports = router;
