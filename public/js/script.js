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
          localStorage.setItem("username", username);
          window.location.href = "/game";
        } else {
          const messageError = document.getElementById("messageError");
          messageError.innerHTML = "Utilisateur ou mot de passe invalide";
        }
      })
      .catch((error) => {
        console.error("Erreur:", error);
      });
  });
