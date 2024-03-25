const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost/jeu_pendu");
//"mongodb+srv://fitzchevalry:yDORYi56qKbiEW66@mj-cluster-1.ml93fuj.mongodb.net/jeu_pendu"
const db = mongoose.connection;
db.on("error", console.error.bind(console, "Erreur de connexion à MongoDB:"));
db.once("open", () => {
  console.log("Connecté à la base de données MongoDB");
});

const joueurSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  avatar: String,
});

const Joueur = mongoose.model("Joueur", joueurSchema);

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
