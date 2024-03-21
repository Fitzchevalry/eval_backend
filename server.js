const http = require("http");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const socketIo = require("socket.io");
const bodyParser = require("body-parser");
const { log } = require("console");

const app = express();
const PORT = 3330;
const server = http.createServer(app);

// Connexion MongoDB
mongoose.connect("mongodb://localhost/jeu_pendu");
const db = mongoose.connection;
db.on("error", console.error.bind(console, "Erreur de connexion à MongoDB:"));
db.once("open", () => {
  console.log("Connecté à la base de données MongoDB");
});

// Schémas MongoDB
const joueurSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  avatar: String,
});

const Joueur = mongoose.model("Joueur", joueurSchema);

// // Schéma pour les mots
// const motSchema = new mongoose.Schema({
//   mot: String,
// });

// // Modèle pour les mots
// const Mot = mongoose.model("Mot", motSchema);

// // Liste de mots prédéfinis
// const motsPredefinis = [
//   "Pomme",
//   "Ordinateur",
//   "Éléphant",
//   "Avion",
//   "Soleil",
//   "Bibliothèque",
//   "Licorne",
//   "Piano",
//   "Montagne",
//   "Guitare",
//   "Océan",
//   "Fusée",
//   "Café",
//   "Arc-en-ciel",
//   "Dinosaure",
//   "Champignon",
//   "Cascade",
//   "Tornade",
//   "Téléphone",
//   "Lune",
// ];

// Mots en BDD
// Mot.insertMany(motsPredefinis.map((mot) => ({ mot })))
//   .then(() => {
//     console.log("Mots prédéfinis insérés avec succès dans la base de données.");
//   })
//   .catch((err) => {
//     console.error("Erreur lors de l'insertion des mots prédéfinis:", err);
//   });

//Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());

// Routes Index
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
//Route Connexion
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "connexion.html"));
});
app.post("/login", (req, res) => {
  const { username, password, avatar } = req.body;

  // Vérification joueur dans BDD
  Joueur.findOne({ username, password })
    .then((joueur) => {
      if (!joueur) {
        // Si pas joueur nouvel enregistrement
        const newJoueur = new Joueur({ username, password, avatar });

        // Enregistrement dans la base de données
        newJoueur
          .save()
          .then(() => {
            console.log("Nouveau joueur enregistré:", newJoueur);
            res.status(200).json({ message: "Inscription réussie !" });
          })
          .catch((err) => {
            console.error("Erreur lors de l'enregistrement du joueur:", err);
            res
              .status(500)
              .json({ message: "Erreur lors de l'enregistrement du joueur" });
          });
      } else {
        // Si joueur existe
        res.status(200).json({ message: "Connexion réussie !" });
      }
    })
    .catch((err) => {
      console.error("Erreur:", err);
      res.status(500).json({ message: "Erreur de connexion" });
    });
});

// Route pour la page de jeu
app.get("/game", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "game.html"));
});

// Serveur WebSocket avec socket.IO
const io = socketIo(server);

let player1 = null;
let player2 = null;
let currentPlayer = null;
let wordToGuess = "";
let guessedWord = "";

io.on("connection", (socket) => {
  console.log("connexion a socket");

  socket.on("login", async (username) => {
    try {
      console.log("username:", username);
      const player = await Joueur.findOne({ username: username });
      if (!player) {
        console.log("Joueur non trouvé", username);
        return;
      }

      if (!player1) {
        player1 = { socket, player };
        currentPlayer = player1;
      } else if (!player2) {
        player2 = { socket, player };
      }

      io.emit("status", {
        player1: player1 && player1.player.username,
        player2: player2 && player2.player.username,
      });
      console.log("Événement 'status' émis :", {
        player1: player1 && player1.player.username,
        player2: player2 && player2.player.username,
      });
      console.log(
        !!player1,
        !!player2,
        !!(currentPlayer === player1),
        "username: ",
        username
      );
      if (player1 && player2 && currentPlayer === player1) {
        console.log("start game emit à :", player1.player.username);

        io.emit("gameStarted", currentPlayer.player.username);
        console.log("gameStarted", currentPlayer.player.username);
      }
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("startGame", (username) => {
    currentPlayer = Math.random() < 0.5 ? player1 : player2;

    io.emit("gameStarted", currentPlayer.player.username);
    console.log("gameStarted", currentPlayer.player.username);
  });

  socket.on("setWord", (word, username) => {
    if (username === currentPlayer.player.username) {
      wordToGuess = word;
      console.log("word to guess:", word);
      guessedWord = "_".repeat(word.length);

      io.emit("wordToGuess", guessedWord);

      if (currentPlayer === player1) {
        currentPlayer = player2;
      } else {
        currentPlayer = player1;
      }
      io.emit("player2Move", currentPlayer.player.username);
    }
  });

  socket.on("guess", (letter, username) => {
    if (username !== currentPlayer.player.username) {
      return;
    }

    let guessedCorrectly = false;
    let newGuessedWord = "";
    for (let i = 0; i < wordToGuess.length; i++) {
      if (wordToGuess[i] === letter) {
        guessedCorrectly = true;
        newGuessedWord += letter;
      } else {
        newGuessedWord += guessedWord[i];
      }
    }
    guessedWord = newGuessedWord;

    io.emit("guessedWord", guessedWord);

    if (!guessedWord.includes("_")) {
      io.emit("gameOver", currentPlayer.player.username);

      if (currentPlayer === player1) {
        currentPlayer = player2;
      } else {
        currentPlayer = player1;
      }
      wordToGuess = "";
      guessedWord = "";
    }
  });

  // socket.on("disconnect", () => {
  //   console.log("user disconnected");
  //   if (player1 === socket) {
  //     player1 = null;
  //   } else if (player2 === socket) {
  //     player2 = null;
  //   }
  // });
});

server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
