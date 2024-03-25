function switchPlayers(currentPlayer, player1, player2, maxAttempts) {
  if (currentPlayer === player1) {
    currentPlayer = player2;
  } else {
    currentPlayer = player1;
  }
  return {
    currentPlayer,
    wordToGuess: "",
    guessedWord: "",
    failedAttempts: 0,
    attemptsLeft: maxAttempts,
    guessedLetters: [],
  };
}

function getOpponent(player1, player2, username) {
  if (player1 && player1.player.username !== username) {
    return player1.player.username;
  } else if (player2 && player2.player.username !== username) {
    return player2.player.username;
  }
  return null;
}

module.exports = { switchPlayers, getOpponent };
