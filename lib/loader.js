//Load page

const loaderStyle = `
<style>
    #globalLoadingOverlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(255, 255, 255, 0.9); z-index: 9999;
        display: none; align-items: center; justify-content: center; 
        backdrop-filter: blur(4px); transition: opacity 0.3s;
    }
    .g-spinner {
        width: 60px; height: 60px; 
        border: 5px solid #ecfdf5; border-top: 5px solid #10b981; 
        border-radius: 50%; animation: g-spin 1s linear infinite;
    }
    @keyframes g-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>
`;

// 2. HTML cho Loader
const loaderHTML = `
    <div id="globalLoadingOverlay">
        <div class="g-spinner"></div>
    </div>
`;

// 3. Hàm khởi tạo (Chạy 1 lần duy nhất khi import)
function initLoader() {
  if (!document.getElementById("globalLoadingOverlay")) {
    document.head.insertAdjacentHTML("beforeend", loaderStyle);
    document.body.insertAdjacentHTML("afterbegin", loaderHTML);
  }
}

// 4. Export hàm bật/tắt
export function toggleLoading(show) {
  initLoader(); // Đảm bảo loader đã được tạo
  const el = document.getElementById("globalLoadingOverlay");
  if (el) {
    if (show) {
      el.style.display = "flex";
      el.style.opacity = "1";
    } else {
      el.style.opacity = "0";
      setTimeout(() => {
        el.style.display = "none";
      }, 300); // Đợi mờ dần rồi tắt
    }
  }
}
