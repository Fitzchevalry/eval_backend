document.addEventListener("DOMContentLoaded", () => {
  // Initialisation de la connexion socket.io
  const socket = io();

  // Récupération des éléments HTML par leur ID
  const wordInput = document.getElementById("wordInput");
  const replayButton = document.getElementById("replay");
  const errorWord = document.getElementById("errorWord");
  const statusElement = document.getElementById("status");
  const wordButton = document.getElementById("wordButton");
  const guessInput = document.getElementById("guessInput");
  const guessButton = document.getElementById("guessButton");
  const errorLetter = document.getElementById("errorLetter");
  const wordToGuessElement = document.getElementById("wordToGuess");
  const attemptsLeftElement = document.getElementById("attemptsLeft");
  const chooseWordSection = document.getElementById("chooseWordSection");
  const lettersGuessedElement = document.getElementById("lettersGuessed");
  const debutPartie = new Date();

  // Récupérer le nom d'utilisateur
  const getUsernameFromLocalStorage = () => {
    return localStorage.getItem("username");
  };

  // Écoute des événements keydown sur le champ de saisie des lettres
  guessInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      guessButton.click();
    }
  });

  // Écoute des événements keydown sur le champ de saisie du mot
  wordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      wordButton.click();
    }
  });

  // Écoute des événements de clic sur le bouton pour soumettre une lettre
  guessButton.addEventListener("click", () => {
    const letter = guessInput.value.trim().toLowerCase();
    if (letter.length !== 1 || !letter.match(/[a-z]/i)) {
      errorLetter.innerHTML = "Entrer une lettre valide !";
      return;
    } else {
      errorLetter.innerHTML = "";
    }

    // Récupération du nom d'utilisateur
    const username = getUsernameFromLocalStorage();
    socket.emit("guess", letter, username);
    guessInput.value = "";
  });

  // Écoute les événements de clic sur le bouton pour soumettre un mot à deviner
  wordButton.addEventListener("click", () => {
    const word = wordInput.value.trim().toLowerCase();
    if (word.length < 3) {
      errorWord.innerHTML = "Entrer un mot d'au moins trois lettres";
      return;
    } else {
      errorWord.innerHTML = "";
    }
    socket.emit("setWord", word, getUsernameFromLocalStorage());
    wordInput.value = "";
  });

  // Écoute les événements de clic sur le bouton pour rejouer
  replayButton.addEventListener("click", () => {
    socket.emit("restartGame");
  });

  // Récupère le nom d'utilisateur
  const username = getUsernameFromLocalStorage();
  socket.emit("login", username);

  // Écoute l'événement "status" pour mettre à jour l'état des joueurs
  socket.on("status", ({ player1, player2 }) => {
    statusElement.innerHTML = `Player 1: ${
      player1 ? player1 : "En attente"
    } | Player 2: ${player2 ? player2 : "En attente"}`;
  });

  // Écoute l'événement "gameStarted" pour commencer le jeu
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

  // Écoute l'événement "player2Move" pour mettre à jour le jeu lorsque le joueur 2 joue
  socket.on("player2Move", (currentPlayer) => {
    statusElement.innerHTML = `Au tour de : ${currentPlayer}`;
    if (username !== currentPlayer) {
      guessInput.disabled = true;
      guessButton.disabled = true;
      wordToGuessElement.style.display = "block";
      chooseWordSection.style.display = "none";
    } else {
      guessInput.disabled = false;
      guessButton.disabled = false;
      wordToGuessElement.style.display = "block";
      chooseWordSection.style.display = "none";
    }
  });

  // Écoute l'événement "updatePlayers" pour mettre à jour les noms des joueurs
  socket.on("updatePlayers", (players) => {
    if (players.length > 0) {
      document.getElementById("player1-name").textContent =
        "Player 1: " + players[0];
      if (players.length > 1) {
        document.getElementById("player2-name").textContent =
          "Player 2: " + players[1];
      }
    }
  });

  // Écoute l'événement "updateHangman" pour mettre à jour l'image du pendu
  socket.on("updateHangman", (failedAttempts) => {
    const hangmanImage = document.getElementById("hangmanImage");
    hangmanImage.src = `/images/Try${failedAttempts}.png`;
  });

  // Écoute l'événement "newGame" pour réinitialiser le jeu
  socket.on("newGame", () => {
    const hangmanImage = document.getElementById("hangmanImage");
    hangmanImage.src = "/images/Try.png"; // Réinitialisation l'image du pendu
  });

  // Écoute l'événement "wordToGuess" pour afficher le mot à deviner
  socket.on("wordToGuess", (word) => {
    wordToGuessElement.textContent = word;
  });

  // Écoute l'événement "guessedWord" pour afficher le mot deviné
  socket.on("guessedWord", (guessedWord) => {
    wordToGuessElement.textContent = guessedWord;
  });

  // Écoute l'événement "guessedLetter" pour afficher les lettres devinées
  socket.on("guessedLetter", (lettersGuessed) => {
    lettersGuessedElement.innerHTML = `Lettres déjà utilisées : ${lettersGuessed.join(
      ", "
    )}`;
  });

  // Écoute l'événement "updateAttempts" pour mettre à jour le nombre de tentatives restantes
  socket.on("updateAttempts", (attemptsLeft) => {
    attemptsLeftElement.innerHTML = `Tentatives restantes : ${attemptsLeft}`;
  });

  // Écoute l'événement "gameEnd" pour gérer la fin du jeu
  socket.on("gameEnd", ({ winner, loser, result }) => {
    if (result === "mot trouvé") {
      statusElement.innerHTML = `Game over. ${winner} wins!`;
    } else if (result === "mot non trouvé") {
      statusElement.innerHTML = `Game over. ${loser} loses!`;
      socket.emit("gameScoreLost", loser);
    }
    lettersGuessedElement.innerHTML = "Lettres déjà tapées : ";
    guessInput.disabled = true;
    guessButton.disabled = true;
    chooseWordSection.style.display = "none";
    replayButton.style.display = "block";
  });
});
