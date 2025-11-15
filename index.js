const rememberUser = localStorage.getItem('rememberUser');

if(rememberUser === 'true'){
    window.location.replace("./pages/home");
}
else {
    window.location.replace("./auth/login");
}