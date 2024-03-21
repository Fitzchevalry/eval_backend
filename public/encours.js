//en cours

//coté serveur
socket.on("setWord", (word, username) => {
  if (currentPlayer === socket && username === currentPlayer.player.username) {
    wordToGuess = word;
    guessedWord = "_".repeat(word.length);

    io.emit("wordToGuess", guessedWord);

    currentPlayer = currentPlayer === player1 ? player2 : player1;
    io.emit("gameStarted", currentPlayer.player.username);
  }
});

socket.on("guess", (letter, username) => {
  if (currentPlayer !== socket) {
    return;
  }

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

    currentPlayer = currentPlayer === player1 ? player2 : player1;
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

//coté client
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
});
