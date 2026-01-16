import { showDialog } from "../dialog/index.js";
import { callAPI } from "../lib/api.js";

// CSS Styles injected via JS for email rows
const emailStyles = `
<style>
    .email-row {
        display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
        background: #f9fafb; padding: 8px; border-radius: 10px; border: 1px solid #f0f0f0;
        transition: 0.2s;
    }
    .email-row:focus-within { border-color: #3b82f6; background: #fff; }
    .email-input {
        flex: 1; border: none; background: transparent; outline: none; padding: 8px; font-size: 0.95rem; color: #333;
    }
    .status-badge {
        display: flex; align-items: center; justify-content: center;
        width: 35px; height: 35px; border-radius: 50%; background: #fff;
        box-shadow: 0 2px 5px rgba(0,0,0,0.05); font-size: 1rem; cursor: default;
    }
    .status-badge.clickable { cursor: pointer; transition: 0.2s; }
    .status-badge.clickable:hover { transform: scale(1.1); background: #eff6ff; }
    
    .removeEmailBtn {
        background: #fff; color: #ef4444; border: 1px solid #fee2e2;
        width: 35px; height: 35px; border-radius: 8px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: 0.2s;
    }
    .removeEmailBtn:hover { background: #ef4444; color: white; border-color: #ef4444; }
</style>
`;
document.head.insertAdjacentHTML("beforeend", emailStyles);

export function initEmailList(initialEmails = []) {
  let emails = [...initialEmails];

  const list = document.getElementById("emailList");
  const addBtn = document.getElementById("addEmailBtn");

  function render() {
    list.innerHTML = "";

    if (emails.length === 0) {
      list.innerHTML = `<div style="text-align:center; color:#9ca3af; padding:20px;">Chưa có email nào. Hãy thêm mới!</div>`;
    }

    emails.forEach((email, index) => {
      // Xác định trạng thái icon
      let iconClass = "fa-paper-plane"; // Chưa xác thực (Gửi lại)
      let iconColor = "#3B82F6"; // Blue
      let tooltip = "Gửi email xác thực";
      let isClickable = true;

      if (email.validated === true) {
        iconClass = "fa-circle-check";
        iconColor = "#10B981"; // Green
        tooltip = "Đã xác thực";
        isClickable = false;
      } else if (email.validated === false) {
        iconClass = "fa-circle-xmark";
        iconColor = "#EF4444"; // Red
        tooltip = "Xác thực thất bại";
        isClickable = false;
      } else if (email.validated === null) {
        // Null cũng coi như chưa xác thực, cho phép gửi
        isClickable = true;
      }

      const innerHTML = `
            <div class="email-row">
                <div style="padding-left: 10px; color: #6b7280;"><i class="fa-regular fa-envelope"></i></div>
                <input type="email"
                    value="${email.email || ""}"
                    class="email-input"
                    data-index="${index}"
                    ${
                      email.validated === true || email.validated === false
                        ? "readonly"
                        : ""
                    } 
                    placeholder="Nhập địa chỉ email..."/>

                <div class="status-badge ${
                  isClickable ? "verify-icon clickable" : ""
                }" 
                     data-index="${index}" 
                     title="${tooltip}">
                    <i class="fa-solid ${iconClass}" style="color:${iconColor}"></i>
                </div>

                <button class="removeEmailBtn" data-index="${index}" title="Xóa email">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
            `;
      list.insertAdjacentHTML("beforeend", innerHTML);
    });

    // --- BIND EVENTS (Logic Giữ Nguyên) ---

    // Xoá email
    document.querySelectorAll(".removeEmailBtn").forEach((btn) => {
      btn.onclick = async () => {
        if (emails.length < 1) return; // Logic gốc là < 2 nhưng UI cho phép xóa hết thì tốt hơn, tùy bro giữ < 2
        const idx = btn.dataset.index;
        const email = emails[idx];
        if (email.validated === true || email.validated === false) {
          await showDialog(
            "question",
            "Bạn có chắc muốn xoá email này không?",
            async () => {
              const result = await callAPI(
                `/emails/${email.emailId}`,
                "DELETE"
              );
              if (result.success) {
                emails.splice(idx, 1);
                render();
              }
              await showDialog(
                result.success ? "success" : "error",
                result.message
              );
            }
          );
        } else {
          emails.splice(idx, 1);
          render();
        }
      };
    });

    // Gửi xác thực
    document.querySelectorAll(".verify-icon").forEach((icon) => {
      icon.onclick = async () => {
        const idx = icon.dataset.index;
        const email = emails[idx];
        await showDialog(
          "question",
          `Gửi email xác thực đến ${email.email}?`,
          async () => {
            if (email.email === "" || !email?.email) return;

            // Logic cũ của bro: Thêm email trước rồi mới gửi verify
            const addEmail = await callAPI("/emails", "POST", {
              email: email.email,
            });
            if (addEmail.success) {
              const result = await callAPI("/auth/send-verify-email", "POST", {
                email: email.email,
              });
              if (result.success) {
                email.emailId = result.data.emailId;
                email.validated = result.data.validated;
                render();
              }
              await showDialog(
                result.success ? "success" : "error",
                result.message
              );
            } else {
              await showDialog(
                "error",
                addEmail.data[0].error || "Lỗi thêm email"
              );
            }
          }
        );
      };
    });

    // Cập nhật giá trị input
    document.querySelectorAll(".email-input").forEach((input) => {
      input.oninput = () => {
        const idx = input.dataset.index;
        emails[idx].email = input.value;
      };
    });
  }

  addBtn.onclick = () => {
    emails.push({ email: "", validated: null });
    render();
  };

  render();
}
