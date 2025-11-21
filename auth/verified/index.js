import { callAPI } from "../../public/api.js";

(async () => {
  const path = window.location.pathname;
  const parts = path.split('/').filter(Boolean);
  const token = parts[parts.length - 1];
  const h1 = document.getElementById("status");
  const image = document.getElementById("image");
  const back = document.getElementById("back");

  h1.style.display = 'block';
  const result = await callAPI(`/auth/verify/${token}`);
  back.style.display = "inline-block";
  h1.classList.add(result.success ? 'success' : 'error')
  image.src = result.success ? "https://cdn-icons-png.flaticon.com/512/190/190411.png"
                              :"https://cdn-icons-png.flaticon.com/512/190/190406.png";
  h1.innerText = result.message;
})();
