const express = require("express");
const session = require("express-session");
const path = require("path");
const bodyParser = require("body-parser");
const { checkPlayerInDatabase } = require("./auth");
const { Partie, Score } = require("./database");
const router = express.Router();

router.use(express.static(path.join(__dirname, "public")));
router.use(bodyParser.json());

router.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: false,
    cookie: { maxAge: 600000 },
  })
);

// Route vers Accueil
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "index.html"));
});

// Route vers Connexion
router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "connexion.html"));
});
//Route pour la requête de connexion
router.post("/login", async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const result = await checkPlayerInDatabase(username, password);
    if (result.message === "Connexion réussie !" || "Inscription réussie !") {
      req.session.username = username;
      res.status(200).json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    next(error);
  }
});

// Route pour la page du jeu
router.get("/game", (req, res) => {
  if (req.session.username) {
    res.sendFile(path.join(__dirname, "public", "html", "game.html"));
  } else {
    res.redirect("/login");
  }
});

// Route pour la page des scores
router.get("/scores", async (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "scores.html"));
});

//Route pour récupérer les scores individuels
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

//Route pour récupérer les scores des parties
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
