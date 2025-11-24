const registerWorker = (url) => {
  const params = {
    version: import.meta.env.VITE_VERSION
  };

  const urlParams = Object.keys(params)
    .map((key) => `${key}=${params[key]}`).join("&");

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register(`${url}?${urlParams}`)
        .then(() => console.info(`Service worker registered successfully. Version: ${params.version}`))
        .catch((err) => console.error("Registration failed:", err));
    });
  }
};

export default registerWorker;
