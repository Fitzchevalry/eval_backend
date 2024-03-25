const http = require("http");
const express = require("express");
const socketIo = require("socket.io");

const { checkPlayerInDatabase, updateScore } = require("./auth");
const { Joueur, Partie, Score } = require("./database");
const routes = require("./routes");

const app = express();
const PORT = 3330;
const server = http.createServer(app);

app.use(routes);

// Serveur WebSocket avec socket.IO
const io = socketIo(server);

let player1 = null;
let player2 = null;
let currentPlayer = null;
let wordToGuess = "";
let guessedWord = "";
let failedAttempts = 0;
const maxAttempts = 6; // Limite maximale de tentatives
let attemptsLeft = maxAttempts;
let startTime = new Date();

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
      io.emit("playerLogin", {
        username: player.username,
      });
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

  socket.on("startGame", () => {
    currentPlayer = Math.random() < 0.5 ? player1 : player2;

    failedAttempts = 0;
    attemptsLeft = maxAttempts;
    guessedLetters = [];

    io.emit("gameStarted", currentPlayer.player.username);
    io.emit("updateAttempts", attemptsLeft);
    console.log("gameStarted", currentPlayer.player.username);
  });

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

  function calculateDuration(startTime, endTime) {
    return Math.abs(endTime - startTime) / 1000; // durée en secondes
  }

  let guessedLetters = [];

  socket.on("guess", (letter, username) => {
    if (username !== currentPlayer.player.username) {
      return;
    }
    if (!guessedLetters.includes(letter)) {
      // Si la lettre devinée est correcte, mettez à jour la liste des lettres déjà devinées
      guessedLetters.push(letter);
      // Envoyer la liste des lettres déjà devinées au client
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
      // Si la tentative échoue
      failedAttempts++; // Incrémenter le compteur de tentatives échouées
      attemptsLeft--;
      io.emit("updateHangman", failedAttempts);

      io.emit("updateAttempts", attemptsLeft);
      if (failedAttempts >= maxAttempts) {
        // Si le joueur a dépassé le nombre maximal de tentatives
        io.emit("gameEnd", {
          loser: currentPlayer.player.username,
          result: "mot non trouvé",
        }); // Déclencher le jeu en échec
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
    // Gérer le cas où l'adversaire n'est pas trouvé, par exemple :
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
