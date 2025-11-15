export function initEmailList(initialEmails = []) {
    let emails = [...initialEmails];

    const list = document.getElementById("emailList");
    const addBtn = document.getElementById("addEmailBtn");

    function render() {
        emails.forEach((email, index) => {
            const innerHTML = `
            <div style = "display: flex; gap: 10px; margin-bottom: 8px">
                <input type="email" value="${email.email}" class="email-input"
                    data-index="${index}" />
                <button class="removeEmailBtn" data-index="${index}"
                    style="background: #EF4444; width: 40px; margin: 8px 0;">X</button>
            </div>
            `;
            list.insertAdjacentHTML("beforeend", innerHTML);
        });

        // Xoá email
        document.querySelectorAll(".removeEmailBtn").forEach(btn => {
            btn.onclick = () => {
                const idx = btn.dataset.index;
                emails.splice(idx, 1);
                render();
            };
        });

        // Cập nhật giá trị email
        document.querySelectorAll(".email-input").forEach(input => {
            input.oninput = () => {
                const idx = input.dataset.index;
                emails[idx] = input.value;
            };
        });
    }

    addBtn.onclick = () => {
        emails.push("");
        render();
    };

    render();

    // Hàm trả kết quả khi cần lưu
    return {
        getEmails() {
            return emails;
        }
    };
}
