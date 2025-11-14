const iconEye = document.getElementsByClassName('icon-eye');
const password = document.getElementsByClassName('password');
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