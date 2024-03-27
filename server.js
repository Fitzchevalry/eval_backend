const http = require("http");
const routes = require("./routes");
const express = require("express");
const socketIo = require("socket.io");
const { updateScore } = require("./auth");
const { Joueur, Partie } = require("./database");

const app = express();
const PORT = 8889;
const server = http.createServer(app);

app.use(routes);

// Serveur WebSocket avec socket.IO
const io = socketIo(server);
let connectedPlayers = [];
let player1 = null;
let player2 = null;
let currentPlayer = null;
let wordToGuess = "";
let guessedWord = "";
let failedAttempts = 0;
const maxAttempts = 6;
let attemptsLeft = maxAttempts;
let startTime = new Date();
let nextPlayer;

// Gestion des événements de connexion WebSocket
io.on("connection", (socket) => {
  console.log("connexion a socket");

  // Gestion de l'événement de connexion d'un utilisateur
  socket.on("login", async (username) => {
    try {
      const player = await Joueur.findOne({ username: username });
      if (!player) {
        console.log("Joueur non trouvé", username);
        return;
      }
      await Joueur.updateOne(
        { _id: player.id },
        { isConnected: true, socketId: socket.id }
      );

      connectedPlayers.push(player);

      // Émet un événement pour mettre à jour les joueurs connectés
      io.emit(
        "updatePlayers",
        connectedPlayers.map((player) => player.username)
      );

      // Émet un événement pour mettre à jour l'état des joueurs
      io.emit(
        "status",
        connectedPlayers.map((player) => player.username)
      );

      // Vérifie s'il y a assez de joueurs pour démarrer une partie
      if (connectedPlayers.length >= 2) {
        player1 = connectedPlayers[0];
        player2 = connectedPlayers[1];
        if (Math.random() < 0.5) {
          currentPlayer = player1;
        } else {
          currentPlayer = player2;
        }
        // Émet un événement pour commencer la partie
        io.emit("gameStarted", { currentPlayer: currentPlayer.username });
      }
    } catch (error) {
      console.error(error);
    }
  });

  // Gestion de l'événement pour définir le mot à deviner
  socket.on("setWord", (word, username) => {
    if (
      (player1 && player1.username === username) ||
      (player2 && player2.username === username)
    ) {
      if (currentPlayer && currentPlayer.username === username) {
        wordToGuess = word;
        guessedWord = "-".repeat(word.length);

        io.emit("wordToGuess", guessedWord);

        // Changement de joueur
        if (currentPlayer === player1) {
          nextPlayer = player2;
        } else {
          nextPlayer = player1;
        }
        io.emit("player2Move", {
          currentPlayer: nextPlayer.username,
        });
        currentPlayer = nextPlayer;
      } else {
        console.log(
          "Le joueur n'est pas autorisé à définir le mot actuellement."
        );
      }
    } else {
      console.log("Le joueur n'est pas dans la partie.");
    }
  });

  // Fonction pour calculer la durée de la partie
  function calculateDuration(startTime, endTime) {
    const durationInSeconds = Math.abs(endTime - startTime) / 1000;
    const durationInMinutes = durationInSeconds / 60;
    return durationInMinutes.toFixed(2);
  }
  // Gestion de l'événement pour deviner une lettre
  let guessedLetters = [];
  socket.on("guess", ({ username, letter }) => {
    if (username !== player1.username && username !== player2.username) {
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
    if (!guessedCorrectly) {
      failedAttempts++;
      attemptsLeft--;
      io.emit("updateHangman", failedAttempts);
      io.emit("updateAttempts", attemptsLeft);

      if (failedAttempts >= maxAttempts) {
        io.emit("gameEnd", {
          loser: username,
          result: "mot non trouvé",
        });
        const endTime = new Date();
        const time = calculateDuration(startTime, endTime);
        const formattedDate = endTime.toLocaleString();
        const partie = new Partie({
          player1: player1.username,
          player2: player2.username,
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
    } else {
      guessedWord = newGuessedWord;
      io.emit("guessedWord", guessedWord);

      if (!guessedWord.includes("-")) {
        io.emit("gameEnd", {
          winner: username,
          result: "mot trouvé",
        });

        const endTime = new Date();
        const time = calculateDuration(startTime, endTime);
        const formattedDate = endTime.toLocaleString();
        const partie = new Partie({
          player1: player1.username,
          player2: player2.username,
          winner: username,
          duration: time,
          word: wordToGuess,
          result: "mot trouvé",
          date: formattedDate,
        });
        partie.save();
        updateScore(username, 10);
        switchPlayers();
      }
    }
  });

  function getOpponent(username) {
    if (player1 && player1.username !== username) {
      return player1.username;
    } else if (player2 && player2.username !== username) {
      return player2.username;
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
  // Gestion de l'événement pour démarrer une nouvelle partie après avoir cliqué sur rejouer côté client
  socket.on("restartGame", () => {
    // let currentPlayer;
    if (Math.random() < 0.5) {
      currentPlayer = player1;
    } else {
      currentPlayer = player2;
    }
    failedAttempts = 0;
    attemptsLeft = maxAttempts;
    guessedLetters = [];

    io.emit("gameStarted", { currentPlayer: currentPlayer.username });
    io.emit("updateAttempts", attemptsLeft);
  });
  // Gestion de l'événement pour mettre à jour la base de données et diffuser les changements à tous les clients connectés en cas de déconnexion
  socket.on("disconnect", async () => {
    try {
      const playerId = socket.id;
      const player = await Joueur.findOne({ socketId: playerId });

      if (player) {
        await Joueur.updateOne({ _id: player.id }, { isConnected: false });
      }
      io.emit("playerDisconnected", playerId);
    } catch (error) {
      console.error(error);
    }
  });

  // Gestion de l'événement pour annuler la partie pour tous les joueurs si un des joueurs est déconnecté
  socket.on("canceledGame", () => {
    connectedPlayers.forEach(async (player) => {
      try {
        await Joueur.updateOne({ _id: player.id }, { isConnected: false });
      } catch (error) {
        console.error(error);
      }
    });
    connectedPlayers = [];
    player1 = null;
    player2 = null;
    currentPlayer = null;
    wordToGuess = "";
    guessedWord = "";
    failedAttempts = 0;
    attemptsLeft = maxAttempts;

    io.emit("redirectLoginPage");
  });
});

server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
