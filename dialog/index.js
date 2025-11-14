import { showDialog } from "./dialog.js";

    document.getElementById("btnTest").addEventListener("click", () => {
        showDialog(true, "Đây là dialog được tách riêng hoàn toàn 🎉");
    });