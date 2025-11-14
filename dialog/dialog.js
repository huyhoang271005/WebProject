import { BASE_URL } from "../public/public";
let currentCallback = null;
let dismissDialog = true;
async function loadDialog() {
  if (document.getElementById("myDialog")) return;

  const response = await fetch(BASE_URL + "/dialog/dialog.html");
  const html = await response.text();

  document.body.insertAdjacentHTML("beforeend", html);

  const dialog = document.getElementById("myDialog");

  document.getElementById("dialogOk").addEventListener("click", async () => {
    dialog.close();
    if(currentCallback && typeof currentCallback === 'function'){
      await currentCallback();
      currentCallback = null;
    }
  });
  dialog.addEventListener('click', async() => {
    if(dismissDialog){
      dialog.close();
    }
    dismissDialog = true
  });
}

// === Hàm showDialog(title, message) ===
export async function showDialog(status, message, callback = null, contentButton = "Đồng ý", dismiss = true){
  currentCallback = callback;
  dismissDialog = dismiss;
  await loadDialog();
  const image = document.getElementById("dialogImage");
  switch(status){
    case 'error':
      image.src = "https://cdn-icons-png.flaticon.com/512/190/190406.png";
      break;
    case 'success': 
      image.src = "https://cdn-icons-png.flaticon.com/512/190/190411.png";
      break;
    case 'question': 
      image.src = "https://cdn-icons-png.flaticon.com/512/5726/5726775.png";
  }
  document.getElementById("dialogTitle").textContent = "Thông báo";
  document.getElementById("dialogMessage").textContent = message;
  document.getElementById("dialogOk").textContent = contentButton;
  document.getElementById("myDialog").showModal();
}
