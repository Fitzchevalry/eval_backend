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
  const enterLetterSection = document.getElementById("enterLetterSection");
  let connectedPlayers = [];

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

  const username = getUsernameFromLocalStorage();
  socket.emit("login", username);

  // Mise à jour des noms des joueurs connectés
  socket.on("updatePlayers", (players) => {
    const player1NameElement = document.getElementById("player1-name");
    const player2NameElement = document.getElementById("player2-name");

    if (players.length > 0) {
      player1NameElement.textContent = "Player 1: " + players[0];
      if (players.length > 1) {
        player2NameElement.textContent = "Player 2: " + players[1];
      } else {
        player2NameElement.textContent = "Player 2: ";
      }
    } else {
      player1NameElement.textContent = "Player 1: ";
      player2NameElement.textContent = "Player 2: ";
    }
  });

  // Mise à jour de l'état des joueurs
  socket.on("status", (players) => {
    let player1Name;
    let player2Name;

    if (players.length > 0) {
      player1Name = players[0];
    } else {
      player1Name = "En attente";
    }

    if (players.length > 1) {
      player2Name = players[1];
    } else {
      player2Name = "En attente";
    }

    statusElement.innerHTML = `Player 1: ${player1Name} | Player 2: ${player2Name}`;
  });

  // Commencer le jeu
  socket.on("gameStarted", ({ currentPlayer }) => {
    statusElement.innerHTML = `Que le jeu commence ! Au tour de ${currentPlayer} d'entrer un mot.`;
    if (username === currentPlayer) {
      replayButton.style.display = "none";
      wordToGuessElement.style.display = "none";
      chooseWordSection.style.display = "block";
      enterLetterSection.style.display = "none";
    } else {
      guessInput.disabled = false;
      guessButton.disabled = false;
      replayButton.style.display = "none";
      chooseWordSection.style.display = "none";
      enterLetterSection.style.display = "none";
      wordToGuessElement.style.display = "none";
    }
  });

  // Envoyer un mot à deviner
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

  // Affiche les tirets du mot à deviner
  socket.on("wordToGuess", (word) => {
    wordToGuessElement.textContent = word;
  });
  //Changer de joueurs
  socket.on("player2Move", ({ currentPlayer }) => {
    statusElement.innerHTML = `Au tour de ${currentPlayer} de deviner le mot.`;
    if (username !== currentPlayer) {
      chooseWordSection.style.display = "none";
      enterLetterSection.style.display = "none";
      wordToGuessElement.style.display = "block";
      attemptsLeftElement.style.display = "inline";
    } else {
      guessInput.disabled = false;
      guessButton.disabled = false;
      chooseWordSection.style.display = "none";
      wordToGuessElement.style.display = "block";
      enterLetterSection.style.display = "inline";
      attemptsLeftElement.style.display = "inline";
    }
  });

  // Envoyer une lettre
  guessButton.addEventListener("click", () => {
    const letter = guessInput.value.trim().toLowerCase();
    if (letter.length !== 1 || !letter.match(/[a-z]/i)) {
      errorLetter.innerHTML = "Entrer une lettre valide !";
      return;
    } else {
      errorLetter.innerHTML = "";
    }
    const username = getUsernameFromLocalStorage();
    socket.emit("guess", { username, letter });

    guessInput.value = "";
  });

  // Afficher les lettres devinées
  socket.on("guessedLetter", (lettersGuessed) => {
    lettersGuessedElement.innerHTML = `Lettres déjà utilisées : ${lettersGuessed.join(
      ", "
    )}`;
  });

  // Afficher le mot deviné
  socket.on("guessedWord", (guessedWord) => {
    wordToGuessElement.textContent = guessedWord;
  });

  // Mise à jour du nombre de tentatives
  socket.on("updateAttempts", (attemptsLeft) => {
    attemptsLeftElement.innerHTML = `Tentatives restantes : ${attemptsLeft}`;
  });

  // Mise à jour de l'image du pendu
  socket.on("updateHangman", (failedAttempts) => {
    const hangmanImage = document.getElementById("hangmanImage");
    hangmanImage.src = `/images/Try${failedAttempts}.png`;
  });

  // Rejouer
  replayButton.addEventListener("click", () => {
    socket.emit("restartGame");
  });

  // Réinitialiser l'image du pendu
  socket.on("newGame", () => {
    const hangmanImage = document.getElementById("hangmanImage");
    hangmanImage.src = "/images/Try.png"; // Réinitialisation l'image du pendu
  });

  // Gérer la fin du jeu
  socket.on("gameEnd", ({ winner, loser, result }) => {
    if (result === "mot trouvé") {
      statusElement.innerHTML = `Game over, ${winner} a gagné !`;
    } else if (result === "mot non trouvé") {
      statusElement.innerHTML = `Game over, ${loser} a perdu !`;
    }
    guessInput.disabled = true;
    guessButton.disabled = true;
    replayButton.style.display = "block";
    chooseWordSection.style.display = "none";
    attemptsLeftElement.style.display = "none";
    enterLetterSection.style.display = "none";
    lettersGuessedElement.style.display = "none";
  });

  // Supprimer le joueur déconnecté de la liste des joueurs connectés
  socket.on("playerDisconnected", (playerId) => {
    const index = connectedPlayers.findIndex(
      (player) => player.id === playerId
    );
    if (index !== -1) {
      connectedPlayers.splice(index, 1);
    }
    socket.emit("canceledGame");
  });

  // Rediriger les joueurs vers la pages login
  socket.on("redirectLoginPage", () => {
    window.location.href = "/login";
  });
});
