document
  .getElementById("loginForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const avatar = document.getElementById("avatar").value;

    // Créer un objet avec les données du formulaire
    const formData = {
      username: username,
      password: password,
      avatar: avatar,
    };

    // Effectuer une requête POST avec les données du formulaire
    fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        username: username,
      },
      body: JSON.stringify(formData),
    })
      .then((response) => {
        if (response.ok) {
          localStorage.setItem("username", username);
          localStorage.setItem("avatar", avatar);
          window.location.href = "/game";
        } else {
          throw new Error("Erreur de connexion");
        }
      })
      .catch((error) => {
        console.error("Erreur:", error);
      });
  });
