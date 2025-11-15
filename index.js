const rememberUser = localStorage.getItem('rememberUser');

if(rememberUser === 'true'){
    window.location.replace("./home");
}
else {
    window.location.replace("./auth/login");
}