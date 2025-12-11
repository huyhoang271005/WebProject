function closePopup() {
    document.getElementById("popup").style.display = "none";
    document.getElementById("checkoutPage").style.display = "block";
}

function openPopup() {
    document.getElementById("checkoutPage").style.display = "none";
    document.getElementById("popup").style.display = "block";
}

const cart = [
    {
        name: "Chuột không dây Logitech M185",
        price: 150000,
        quantity: 1,
        img: "https://cdn-icons-png.flaticon.com/512/1170/1170678.png"
    },
    {
        name: "Bàn phím cơ Akko 3068",
        price: 890000,
        quantity: 1,
        img: "https://cdn-icons-png.flaticon.com/512/484/484167.png"
    },
    {
        name: "Tai nghe DareU EH925S",
        price: 350000,
        quantity: 2,
        img: "https://cdn-icons-png.flaticon.com/512/3798/3798746.png"
    }
];

function renderCart() {
    const itemList = document.getElementById("itemList");
    const totalPrice = document.getElementById("totalPrice");

    let html = "";
    let total = 0;

    cart.forEach(item => {
        html += `
            <div class="item">
                <img src="${item.img}">
                <div class="item-info">
                    <p class="name">${item.name}</p>
                    <p>Số lượng: ${item.quantity}</p>
                    <p class="price">${(item.price * item.quantity).toLocaleString()}đ</p>
                </div>
            </div>
        `;
        total += item.price * item.quantity;
    });

    itemList.innerHTML = html;
    totalPrice.textContent = total.toLocaleString() + "đ";
}

renderCart();