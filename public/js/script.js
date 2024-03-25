document
  .getElementById("loginForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();
    // Récupère les valeurs des champs d'identification (nom d'utilisateur et mot de passe)
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Crée un objet contenant les données du formulaire à envoyer au serveur
    const formData = {
      username: username,
      password: password,
    };

    // Envoie une requête POST vers "/login" avec les données du formulaire
    fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        username: username,
      },
      body: JSON.stringify(formData),
    })
      .then((response) => {
        // Gère la réponse de la requête
        if (response.ok) {
          localStorage.setItem("username", username); // Stocke le nom d'utilisateur dans le LocalStorage
          window.location.href = "/game"; // Redirige l'utilisateur vers la page de jeu
        } else {
          throw new Error("Erreur de connexion");
        }
      })
      .catch((error) => {
        console.error("Erreur:", error);
      });
  });
