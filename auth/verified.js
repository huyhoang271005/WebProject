import { callAPI } from "../public/api.js";

(async () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const h1 = document.getElementById("status");
  const image = document.getElementById("image");
  const back = document.getElementById("back");

  const result = await callAPI(`/auth/verify?token=${token}`);
  back.style.display = "inline-block";
  h1.classList.add(result.success ? 'success' : 'error')
  image.src = result.success ? "https://cdn-icons-png.flaticon.com/512/190/190411.png"
                              :"https://cdn-icons-png.flaticon.com/512/190/190406.png";
  h1.innerText = result.message;
})();
