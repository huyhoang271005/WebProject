Phía Backend
Nhận response từ API cố định với form

{
	success: true/false,
	message: <Tin nhắn>,
	data: <Có thể là 1 object hoặc 1 list object tuỳ thuộc>
	(Nếu có lỗi xảy ra thì ở data sẽ có 1 list object [{error: <Thông tin lỗi>}, ....])
}

Phía Frontend
Các hàm chung gồm
+ callApi(<đường dẫn>, <method>, <data>, <có phải dữ liệu part không(true/false)>)  //Hàm gọi api
+ getEye()  //Hàm để lấy hiệu ứng toggle password
+ showDialog(<success/error/question>, <message>, <callback>, <nội dung nút button>, <có đóng dialog khi nhấn bên ngoài không (true/false)>) // HIện dialog thông báo
+ getLoader(<id phím button>, <callback>)   // Lấy hiệu ứng load của nút button trong quá trình chạy callback
+ convertToVNTime(<giờ UTC>)  //Chuyển đổi giờ UTC sang giờ VN
