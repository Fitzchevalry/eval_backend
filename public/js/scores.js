// Affichage des scores individuels
fetch("/individual-scores")
  .then((response) => response.json())
  .then((individualScores) => {
    const individualScoresTableBody = document.getElementById(
      "individualScoresTableBody"
    );
    individualScores.forEach((score) => {
      const row = document.createElement("div");
      row.classList.add("score-row");
      row.innerHTML = `
        <div class="score-cell">Date : ${score.date}</div>
        <div class="score-cell">Joueur :${score.username}</div>
        <div class="score-cell">Score : ${score.score}</div>
      `;
      individualScoresTableBody.appendChild(row);
    });
  })
  .catch((error) =>
    console.error(
      "Erreur lors de la récupération des scores individuels :",
      error
    )
  );

// Affichage des scores de partie
fetch("/game-scores")
  .then((response) => response.json())
  .then((gameScores) => {
    const gameScoresTableBody = document.getElementById("gameScoresTableBody");
    gameScores.forEach((score) => {
      const row = document.createElement("div");
      row.classList.add("score-row");
      row.innerHTML = `
      <div class="score-cell">Date : ${score.date}</div>
        <div class="score-cell">Joueur 1 : ${score.player1}</div>
        <div class="score-cell">Joueur 2 : ${score.player2}</div>
        <div class="score-cell">Gagnant de la partie : ${score.winner}</div>
        <div class="score-cell">Durée de la partie : ${score.duration} secondes</div>
        <div class="score-cell">Mot à deviné : ${score.word}</div>
        <div class="score-cell">Status du mot : ${score.result}</div>
      `;
      gameScoresTableBody.appendChild(row);
    });
  })
  .catch((error) =>
    console.error(
      "Erreur lors de la récupération des scores de partie :",
      error
    )
  );
