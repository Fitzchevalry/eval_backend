// script.js

document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  const statusElement = document.getElementById("status");
  const wordToGuessElement = document.getElementById("wordToGuess");
  const wordInput = document.getElementById("wordInput");
  const wordButton = document.getElementById("wordButton");
  const guessInput = document.getElementById("guessInput");
  const guessButton = document.getElementById("guessButton");
  const chooseWordSection = document.getElementById("chooseWordSection");
  const replayButton = document.getElementById("replay");
  // Fonction recup username localStorage
  const getUsernameFromLocalStorage = () => {
    return localStorage.getItem("username");
  };

  guessButton.addEventListener("click", () => {
    const letter = guessInput.value.trim().toLowerCase();
    if (letter.length !== 1 || !letter.match(/[a-z]/i)) {
      alert("Entrer une lettre valide !");
      return;
    }
    const username = getUsernameFromLocalStorage();
    socket.emit("guess", letter, username);
    guessInput.value = "";
  });

  wordButton.addEventListener("click", () => {
    const word = wordInput.value.trim().toLowerCase();
    if (word.length < 3) {
      alert("Entrer un mot d'au moins trois lettres");
      return;
    }
    console.log("le mot est :", word);
    const username = getUsernameFromLocalStorage();
    socket.emit("setWord", word, username);
    wordInput.value = "";
  });

  replayButton.addEventListener("click", () => {
    socket.emit("startGame");
  });

  // Récup username localStorage
  const username = getUsernameFromLocalStorage();

  socket.emit("login", username);

  // Gestion événements Socket.io
  socket.on("status", ({ player1, player2 }) => {
    statusElement.innerHTML = `Player 1: ${
      player1 ? player1 : "En attente"
    } | Player 2: ${player2 ? player2 : "En attente"}`;
  });

  socket.on("gameStarted", (currentPlayer) => {
    statusElement.innerHTML = `Que le jeu commence ! Au tour de : ${currentPlayer}`;
    if (username === currentPlayer) {
      guessInput.disabled = true;
      guessButton.disabled = true;
      chooseWordSection.style.display = "block";
      wordToGuessElement.style.display = "none";
      replayButton.style.display = "none";
    } else {
      guessInput.disabled = false;
      guessButton.disabled = false;
      chooseWordSection.style.display = "none";
      wordToGuessElement.style.display = "none";
      replayButton.style.display = "none";
    }
  });

  socket.on("player2Move", (currentPlayer) => {
    statusElement.innerHTML = `Au tour de : ${currentPlayer}`;
    if (username !== currentPlayer) {
      guessInput.disabled = true;
      guessButton.disabled = true;
      wordToGuessElement.style.display = "block";
      chooseWordSection.style.display = "none";
    }
    if (username === currentPlayer) {
      guessInput.disabled = false;
      guessButton.disabled = false;
      wordToGuessElement.style.display = "block";
      chooseWordSection.style.display = "none";
    }
  });

  socket.on("wordToGuess", (word) => {
    wordToGuessElement.textContent = word;
  });

  socket.on("guessedWord", (guessedWord) => {
    wordToGuessElement.textContent = guessedWord;
  });

  socket.on("gameOver", (winner) => {
    statusElement.innerHTML = `Game over. ${winner} wins!`;
    guessInput.disabled = true;
    guessButton.disabled = true;
    chooseWordSection.style.display = "none";
    replayButton.style.display = "block";
  });
});
