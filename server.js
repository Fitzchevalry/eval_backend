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
      await Joueur.updateOne(
        { _id: player.id },
        { isConnected: true, socketId: socket.id }
      );
      // Ajoute l'utilisateur à la liste des joueurs connectés
      connectedPlayers.push(player);

      // Émet un événement pour mettre à jour les joueurs connectés
      io.emit(
        "updatePlayers",
        connectedPlayers.map((player) => player.username)
      );

      // Émet un événement pour mettre à jour l'état des joueurs
      io.emit("status", {
        player1: player1 && player1.player.username,
        player2: player2 && player2.player.username,
      });

      // Vérifie s'il y a assez de joueurs pour démarrer une partie
      if (connectedPlayers.length >= 2) {
        // Sélectionne les deux premiers joueurs de la liste des joueurs connectés
        player1 = connectedPlayers[0];
        player2 = connectedPlayers[1];

        // Émet un événement pour démarrer la partie
        io.emit("gameStarted", {
          player1: player1.username,
          player2: player2.username,
        });
      }
    } catch (error) {
      console.error(error);
    }
  });

  // Gestion de l'événement pour démarrer une nouvelle partie après avoir cliqué sur rejouer dans le client
  socket.on("restartGame", () => {
    // Sélectionne aléatoirement le joueur qui commencera la partie
    currentPlayer = Math.random() < 0.5 ? player1 : player2;
    failedAttempts = 0;
    attemptsLeft = maxAttempts;
    guessedLetters = [];
    // Émet un événement pour démarrer la partie
    io.emit("gameStarted", {
      player1: player1.username,
      player2: player2.username,
    });
    io.emit("updateAttempts", attemptsLeft);
    console.log("gameStarted", {
      player1: player1.username,
      player2: player2.username,
    });
  });

  // Gestion de l'événement pour définir le mot à deviner
  socket.on("setWord", (word, username) => {
    if (
      (player1 && player1.username === username) ||
      (player2 && player2.username === username)
    ) {
      // Vérifiez si le joueur actuel est autorisé à définir le mot
      // Vérifiez si le joueur actuel est autorisé à définir le mot
      if (
        (!currentPlayer || currentPlayer === player1) &&
        (player1.username === username || player2.username === username)
      ) {
        // Le joueur est autorisé à définir le mot
        wordToGuess = word;
        console.log("word to guess:", word);
        guessedWord = "-".repeat(word.length);

        io.emit("wordToGuess", guessedWord);

        // Changez de joueur pour le prochain tour
        const nextPlayer = currentPlayer === player1 ? player2 : player1;
        io.emit("player2Move", {
          currentPlayer: nextPlayer.username,
          player1: player1 ? player1.username : null,
          player2: player2 ? player2.username : null,
        });
        currentPlayer = nextPlayer;
      } else {
        // Le joueur n'est pas autorisé à définir le mot actuellement
        console.log(
          "Le joueur n'est pas autorisé à définir le mot actuellement."
        );
      }
    } else {
      // Le joueur n'est pas dans la partie
      console.log("Le joueur n'est pas dans la partie.");
    }
  });

  // Fonction pour calculer la durée de la partie
  function calculateDuration(startTime, endTime) {
    return Math.abs(endTime - startTime) / 1000;
  }
  // Gestion de l'événement pour deviner une lettre
  let guessedLetters = [];
  // Gestion de l'événement pour deviner une lettre
  socket.on("guess", ({ username, letter }) => {
    if (username !== player1.username && username !== player2.username) {
      return;
    } else {
      console.log("ne rentres pas dans la condition");
    }
    if (!guessedLetters.includes(letter)) {
      guessedLetters.push(letter);
      io.emit("guessedLetter", guessedLetters);
    } else {
      console.log("pas emit à guessedLetter");
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
      // Si la lettre a été correctement devinée
      // Mettez à jour le mot deviné
      guessedWord = newGuessedWord;
      io.emit("guessedWord", guessedWord);

      // Vérifiez si le mot a été entièrement deviné
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
  // Définissez l'événement canceledGame côté serveur
  socket.on("canceledGame", () => {
    // Parcourez tous les utilisateurs connectés
    connectedPlayers.forEach(async (player) => {
      try {
        // Mettez à jour l'état de connexion du joueur dans la base de données
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
    // Émettez un événement pour rediriger les utilisateurs vers la page de connexion
    io.emit("redirectLoginPage");
  });

  // Lorsqu'un joueur se déconnecte, vous pouvez mettre à jour la base de données et diffuser les changements à tous les clients connectés
  socket.on("disconnect", async () => {
    try {
      // Recherchez le joueur dans la base de données par son ID ou un autre identifiant unique
      const playerId = socket.id;
      const player = await Joueur.findOne({ socketId: playerId });
      console.log(playerId);
      if (player) {
        // Mettez à jour l'état de connexion du joueur dans la base de données
        await Joueur.updateOne({ _id: player.id }, { isConnected: false });
      }
      // Diffusez les changements aux clients connectés
      io.emit("playerDisconnected", playerId);
      console.log(playerId);
    } catch (error) {
      console.error(error);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
