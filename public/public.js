export const BASE_URL = "https://huyhoang271005.github.io/WebProject";
export async function domIconEye() {
    const iconEye = document.getElementsByClassName('icon-eye');
    for(let i of iconEye){
        i.addEventListener('click', ()=>{
            const input = i.closest('.password-layout').querySelector('.password');
            if(input.type === 'password'){
                input.type = 'text';
                i.classList.remove('fa-eye');
                i.classList.add('fa-eye-slash');
            }
            else {
                input.type = 'password';
                i.classList.remove('fa-eye-slash');
                i.classList.add('fa-eye');
            }
            //Focus input
            input.focus();
            const val = input.value;
            input.value = '';
            input.value = val;
        })
    }
}

export async function getLoader(idLayout) {
    const loader = document.getElementById(idLayout);
    if (!loader) return;

    if (loader.querySelector('.icon-loader')) return;

    const response = await fetch(BASE_URL + "/public/icon-loader.html");
    const html = await response.text();
    loader.insertAdjacentHTML("beforeend", html);
    loader.querySelector('.icon-loader').style.display = 'none';
}


export function showLoader(showLoading) {
    const loader = document.getElementsByClassName('icon-loader');
    for (let load of loader){
        if(showLoading){
            load.style.display = 'inline-block';
        }
        else {
            load.style.display = 'none';
        }
    }
}

export async function getEye() {
    const layoutPassword = document.getElementsByClassName('password-layout');
    const response = await fetch(BASE_URL + "/public/icon-eye.html");
    const html = await response.text();
    for (let l of layoutPassword){
        if(l.querySelector('.icon-eye')) continue;
        l.insertAdjacentHTML('beforeend', html);
    }
}