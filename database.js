const mongoose = require("mongoose");
require("dotenv").config();
const uri = process.env.MONGODB_URI;

mongoose.connect(uri);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "Erreur de connexion à MongoDB:"));
db.once("open", () => {
  console.log("Connecté à la base de données MongoDB");
});

// Définition du schéma pour les joueurs
const joueurSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  socketId: String,
});

const Joueur = mongoose.model("Joueur", joueurSchema);

// Définition du schéma pour les parties jouées
const partieSchema = new mongoose.Schema({
  player1: String,
  player2: String,
  winner: String,
  duration: Number,
  word: String,
  result: String,
  date: String,
});

const Partie = mongoose.model("Partie", partieSchema);

// Définition du schéma pour les scores individuels
const scoreSchema = new mongoose.Schema({
  username: { type: String, required: true },
  score: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
});

scoreSchema.set("toJSON", {
  transform: function (doc, ret) {
    ret.date = ret.date.toLocaleString();
    return ret;
  },
});

const Score = mongoose.model("Score", scoreSchema);

module.exports = { Joueur, Partie, Score };
