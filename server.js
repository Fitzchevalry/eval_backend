const http = require("http");
const routes = require("./routes");
const express = require("express");
const socketIo = require("socket.io");
const { updateScore } = require("./auth");
const { Joueur, Partie } = require("./database");

const app = express();
const PORT = 3330;
const server = http.createServer(app);

app.use(routes);

// Serveur WebSocket avec socket.IO
const io = socketIo(server);
let players = [];
let player1 = null;
let player2 = null;
let currentPlayer = null;
let wordToGuess = "";
let guessedWord = "";
let failedAttempts = 0;
const maxAttempts = 6;
let attemptsLeft = maxAttempts;
let startTime = new Date();

// Gestion des événements de connexion WebSocket
io.on("connection", (socket) => {
  console.log("connexion a socket");

  // Gestion de l'événement de connexion d'un utilisateur
  socket.on("login", async (username) => {
    // Vérification de l'utilisateur dans la base de données
    try {
      const player = await Joueur.findOne({ username: username });
      if (!player) {
        console.log("Joueur non trouvé", username);
        return;
      }
      // Ajoute l'utilisateur à la liste des joueurs connectés
      players.push(username);

      // Émet un événement pour mettre à jour les joueurs connectés
      io.emit("updatePlayers", players);
      if (!player1) {
        player1 = { socket, player };
        currentPlayer = player1;
      } else if (!player2) {
        player2 = { socket, player };
      }
      // Émet un événement pour informer de la connexion d'un joueur
      io.emit("playerLogin", {
        username: player.username,
      });
      // Émet un événement pour mettre à jour l'état des joueurs
      io.emit("status", {
        player1: player1 && player1.player.username,
        player2: player2 && player2.player.username,
      });
      // Sélectionne le joueur actuel et démarre le jeu si les deux joueurs sont connectés
      if (player1 && player2 && currentPlayer === player1) {
        io.emit("gameStarted", currentPlayer.player.username);
      }
    } catch (error) {
      console.error(error);
    }
  });

  // Gestion de l'événement pour démarrer une nouvelle partie
  socket.on("startGame", () => {
    // Sélectionne aléatoirement le joueur qui commencera la partie
    currentPlayer = Math.random() < 0.5 ? player1 : player2;
    failedAttempts = 0;
    attemptsLeft = maxAttempts;
    guessedLetters = [];
    // Émet un événement pour démarrer la partie
    io.emit("gameStarted", currentPlayer.player.username);
    io.emit("updateAttempts", attemptsLeft);
    console.log("gameStarted", currentPlayer.player.username);
  });

  // Gestion de l'événement pour définir le mot à deviner
  socket.on("setWord", (word, username) => {
    if (username === currentPlayer.player.username) {
      wordToGuess = word;
      console.log("word to guess:", word);
      guessedWord = "-".repeat(word.length);

      io.emit("wordToGuess", guessedWord);

      if (currentPlayer === player1) {
        currentPlayer = player2;
      } else {
        currentPlayer = player1;
      }
      io.emit("player2Move", currentPlayer.player.username);
    }
  });
  // Fonction pour calculer la durée de la partie
  function calculateDuration(startTime, endTime) {
    return Math.abs(endTime - startTime) / 1000;
  }
  // Gestion de l'événement pour deviner une lettre
  let guessedLetters = [];
  socket.on("guess", (letter, username) => {
    if (username !== currentPlayer.player.username) {
      return;
    }
    if (!guessedLetters.includes(letter)) {
      guessedLetters.push(letter);
      io.emit("guessedLetter", guessedLetters);
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

    // Gestion de la fin de la partie
    if (!guessedWord.includes("-")) {
      io.emit("gameEnd", {
        winner: currentPlayer.player.username,
        result: "mot trouvé",
      });

      const endTime = new Date();
      const time = calculateDuration(startTime, endTime);
      const formattedDate = endTime.toLocaleString();
      const partie = new Partie({
        player1: player1.player.username,
        player2: player2.player.username,
        winner: currentPlayer.player.username,
        duration: time,
        word: wordToGuess,
        result: "mot trouvé",
        date: formattedDate,
      });
      partie.save();
      updateScore(username, 10);
      switchPlayers();
    } else if (!guessedCorrectly) {
      failedAttempts++;
      attemptsLeft--;
      io.emit("updateHangman", failedAttempts);

      io.emit("updateAttempts", attemptsLeft);
      if (failedAttempts >= maxAttempts) {
        io.emit("gameEnd", {
          loser: currentPlayer.player.username,
          result: "mot non trouvé",
        });
        const endTime = new Date();
        const time = calculateDuration(startTime, endTime);
        const formattedDate = endTime.toLocaleString();
        const partie = new Partie({
          player1: player1.player.username,
          player2: player2.player.username,
          winner: getOpponent(username),
          duration: time,
          word: wordToGuess,
          result: "mot non trouvé",
          date: formattedDate,
        });
        partie.save();
        updateScore(getOpponent(username), 10);
        switchPlayers();
        failedAttempts = 0;
      }
    }
  });

  function getOpponent(username) {
    if (player1 && player1.player.username !== username) {
      return player1.player.username;
    } else if (player2 && player2.player.username !== username) {
      return player2.player.username;
    }
    return null;
  }

  function switchPlayers() {
    if (currentPlayer === player1) {
      currentPlayer = player2;
    } else {
      currentPlayer = player1;
    }
    wordToGuess = "";
    guessedWord = "";
    failedAttempts = 0;
    attemptsLeft = maxAttempts;
    guessedLetters = [];
    io.emit("newGame");
  }

  socket.on("disconnect", () => {
    console.log("user disconnected");
    if (player1 === socket) {
      player1 = null;
    } else if (player2 === socket) {
      player2 = null;
    }
  });
});

server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
