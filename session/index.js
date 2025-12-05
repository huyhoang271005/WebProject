import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
import { loadPage, convertToVNTime } from "../public/public.js";

// --- CẤU HÌNH API ---
// Bro lưu ý: tớ để size=20 để hiện được nhiều thiết bị hơn, chứ size=3 thì ít quá
const API_GET_SESSION = "/sessions?page=0&size=20";

// --- QUAN TRỌNG: Link API xoá session ---
// Tớ đang giả định backend dùng Method DELETE vào link này.
// Nếu sai bro hỏi bạn backend: "API revoke session đường dẫn là gì?" nhé.
const API_REVOKE_SESSION = "/logout";

const sessionListEl = document.getElementById("sessionList");
const contentDiv = document.getElementById("info");

// Hàm lấy icon
function getDeviceIcon(deviceName) {
  if (
    deviceName.includes("Android") ||
    deviceName.includes("iPhone") ||
    deviceName.includes("Mobile")
  ) {
    return "fa-mobile-screen";
  }
  return "fa-laptop";
}

// 1. Hàm tải danh sách từ Server thật
async function loadSessions() {
  // Gọi API thật
  const result = await callAPI(API_GET_SESSION);

  if (!result.success) {
    // Nếu lỗi (ví dụ chưa đăng nhập), hiện thông báo
    await showDialog("error", result.message);
    return;
  }

  // Lấy dữ liệu từ backend trả về
  // Cấu trúc: { data: { listData: [...] } }
  const sessions = result.data.listData || [];
  renderSessions(sessions);
}

// 2. Hàm hiển thị (Render)
function renderSessions(sessions) {
  sessionListEl.innerHTML = "";

  // Đảm bảo bảng hiện ra
  if (contentDiv) contentDiv.style.display = "block";
  const table = document.querySelector("table");
  if (table) table.style.display = "table";

  if (sessions.length === 0) {
    sessionListEl.innerHTML =
      '<tr><td colspan="4" style="text-align:center;">Không tìm thấy phiên đăng nhập nào.</td></tr>';
    return;
  }

  sessions.forEach((session) => {
    const deviceNamePretty = session.deviceName;
    const icon = getDeviceIcon(session.deviceName);

    // --- XỬ LÝ TRẠNG THÁI ---
    let statusHtml = "";
    let actionHtml = "";
    let rowClass = ""; // Class để chỉnh màu dòng nếu cần

    if (session.thisSession === true) {
      // Trường hợp 1: Máy đang dùng
      statusHtml = '<span class="status-badge current">Đang truy cập</span>';
      actionHtml =
        '<span style="color: #aaa; font-size: 0.9rem;">(Thiết bị này)</span>';
      rowClass = "row-current";
    } else if (session.revoked === true) {
      // Trường hợp 2: Đã bị đăng xuất (Revoked)
      statusHtml = '<span class="status-badge revoked">Đã đăng xuất</span>';
      actionHtml = '<span style="color: #aaa;">-</span>'; // Không cho xoá tiếp
      rowClass = "row-revoked";
    } else {
      // Trường hợp 3: Máy khác đang hoạt động bình thường
      statusHtml = '<span class="status-badge active">Đang hoạt động</span>';
      actionHtml = `<button class="revoke-btn" data-id="${session.sessionId}">Đăng xuất</button>`;
    }

    const tr = document.createElement("tr");
    if (rowClass) tr.classList.add(rowClass);

    tr.innerHTML = `
            <td data-label="Thiết bị">
                <div class="device-info">
                    <i class="fa-solid ${icon} device-icon"></i>
                    <div>
                        <div style="font-weight: 500;">${deviceNamePretty}</div>
                        <div style="font-size: 0.8rem; color: #9ca3af; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${
                          session.userAgent
                        }">
                            ${session.deviceName || session.userAgent}
                        </div>
                    </div>
                </div>
            </td>
            <td data-label="Thời gian">
                ${convertToVNTime(session.lastLogin)}
            </td>
            <td data-label="Trạng thái">
                ${statusHtml}
            </td>
            <td data-label="Hành động">
                ${actionHtml}
            </td>
        `;
    sessionListEl.appendChild(tr);
  });

  // Gắn sự kiện click cho các nút Đăng xuất
  document.querySelectorAll(".revoke-btn").forEach((btn) => {
    btn.onclick = async () => {
      const sessionId = btn.dataset.id;
      await handleRevoke(sessionId);
    };
  });
}

// 3. Hàm xử lý khi bấm nút Đăng xuất (Revoke)
async function handleRevoke(sessionId) {
  await showDialog(
    "question",
    "Bạn có chắc muốn đăng xuất thiết bị này không?",
    async () => {
      // Gọi API DELETE: /auth/sessions/{sessionId}
      const result = await callAPI(
        `${API_REVOKE_SESSION}/${sessionId}`
      );

      if (result.success) {
        await showDialog("success", "Đã đăng xuất thiết bị thành công");
        // Tải lại danh sách để cập nhật trạng thái
        await loadSessions();
      } else {
        await showDialog(
          "error",
          result.message || "Có lỗi xảy ra khi đăng xuất."
        );
      }
    }
  );
}

// Chạy hàm khi vào trang
await loadPage(async () => {
  await loadSessions();
});
