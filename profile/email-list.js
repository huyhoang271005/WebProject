import { showDialog } from "../dialog/index.js";
export function initEmailList(initialEmails = []) {
    let emails = [...initialEmails];

    const list = document.getElementById("emailList");
    const addBtn = document.getElementById("addEmailBtn");
    function render() {
        list.innerHTML = "";
        emails.forEach((email, index) => {
            const innerHTML = `
            <div class="email-row">
                <input type="email"
                    value="${email.email}"
                    class="email-input"
                    data-index="${index}"
                    ${email.validated ? "readonly" : ""} />

                <i class="status-icon fa-solid 
                    ${email.validated === true ? 'fa-circle-check' : 
                    email.validated === false ? 'fa-circle-xmark' : 
                    'fa-paper-plane'}"
                    style="color:${
                        email.validated === true ? '#10B981' : 
                        email.validated === false ? '#EF4444' : 
                        '#3B82F6'
                    };">
                </i>


                <button class="removeEmailBtn" data-index="${index}">
                    X
                </button>
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
        emails.push({email: 'abc@gmail.com'});
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
