const { Joueur, Score } = require("./database");

async function checkPlayerInDatabase(username, password, avatar) {
  try {
    const joueur = await Joueur.findOne({ username, password });
    if (!joueur) {
      const newJoueur = new Joueur({ username, password });
      await newJoueur.save();
      console.log("Nouveau joueur enregistré :", newJoueur);
      return { message: "Inscription réussie !" };
    } else {
      console.log("Connexion réussie pour le joueur :", joueur);
      return { message: "Connexion réussie !" };
    }
  } catch (error) {
    throw new Error("Le pseudonyme est déjà utilisé");
  }
}

async function updateScore(username, scoreIncrement) {
  try {
    let playerScore = await Score.findOne({ username });
    if (!playerScore) {
      playerScore = new Score({ username });
    }
    playerScore.score += scoreIncrement;
    await playerScore.save();
    console.log("score du joueur enregistré");
  } catch (error) {
    console.error("Erreur lors de la mise à jour du score :", error);
  }
}

module.exports = { checkPlayerInDatabase, updateScore };
