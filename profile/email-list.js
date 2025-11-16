import { showDialog } from "../dialog/index.js";
export function initEmailList(initialEmails = []) {
    let emails = [...initialEmails];

    const list = document.getElementById("emailList");
    const addBtn = document.getElementById("addEmailBtn");
    function render() {
        list.innerHTML = "";
        emails.forEach((email, index) => {
            const innerHTML = `
            <div style = "display: flex; gap: 10px; margin-bottom: 8px">
                <input type="email" value="${email.email}" class="email-input"
                    data-index="${index}" ${email.validated ? 'readonly': ''}/>
                    <i class="fa-solid ${email.validated ? 'fa-circle-check' : 'fa-circle-xmark'}"
                        style="color:${email.validated ? '#10B981' : '#EF4444'};"></i>
                <button class="removeEmailBtn" data-index="${index}"
                    style="background: #EF4444; width: 40px; margin: 8px 0; padding: 0;">X</button>
            </div>
            `;
            list.insertAdjacentHTML("beforeend", innerHTML);
        });

        // Xoá email
        document.querySelectorAll(".removeEmailBtn").forEach(btn => {
            btn.onclick = () => {
                if(emails.length < 2) return;
                const idx = btn.dataset.index;
                if(emails[idx].validated){
                    showDialog('question', 'Bạn có chắc muốn xoá email đã được xác thực rồi không?', ()=>{
                        emails.splice(idx, 1);
                        render();
                    });
                }
                else {
                    emails.splice(idx, 1);
                    render();
                }
            };
        });

        // Cập nhật giá trị email
        document.querySelectorAll(".email-input").forEach(input => {
            input.oninput = () => {
                const idx = input.dataset.index;
                emails[idx].email = input.value;
            };
        });
    }

    addBtn.onclick = () => {
        emails.push({emailId: null, email: 'abc@gmail.com', validated: false});
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
