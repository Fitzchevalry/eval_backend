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
      <div class="score-cell">
        <div>Date : ${score.date}</div>
        <div>Joueur :${score.username}</div>
        <div>Score : ${score.score}</div>
      </div>
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
      <div class="score-cell">
        <div>Date : ${score.date}</div>
        <div>Joueurs : ${score.player1} et ${score.player2}</div>
        <div>Gagnant : ${score.winner}</div>
        <div>Durée de la partie : ${score.duration} min</div>
        <div>Mot à deviné : ${score.word} - ${score.result} </div> 
      </div>
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
