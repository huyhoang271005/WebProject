// fake user
export const mockUsers = [
    { id: 1, name: 'Sơn Tùng M-TP', lastMsg: 'Tối nay đi diễn Sky Tour nhé!', time: '10:30', active: true, avatar: 'S', color: '#EF4444', status: 'Vừa truy cập' },
    { id: 2, name: 'Thằng bạn thân', lastMsg: 'Cho tao vay 500k đi...', time: 'Vừa xong', active: false, avatar: 'T', color: '#10B981', status: 'Đang hoạt động' },
    { id: 3, name: 'Leader Team', lastMsg: 'Deadline xong chưa em?', time: 'Hôm qua', active: false, avatar: 'L', color: '#3B82F6', status: 'Offline' }
];

// fake tin nhắn
export const mockMessagesDB = {
    1: [
        { type: 'received', content: 'Em trai, tối rảnh không?', time: '2023-11-06T18:00:00Z' },
        { type: 'sent', content: 'Rảnh anh ơi, sao thế ạ?', time: '2023-11-06T18:05:00Z' },
        { type: 'received', content: 'Qua diễn Sky Tour với anh cho vui.', time: '2023-11-06T18:10:00Z' }
    ],
    2: [
        { type: 'received', content: 'Ê mày.', time: '2023-11-06T09:00:00Z' },
        { type: 'sent', content: 'Gì?', time: '2023-11-06T09:01:00Z' },
        { type: 'received', content: 'Cho tao vay 500k, cuối tháng trả gấp đôi.', time: '2023-11-06T09:02:00Z' }
    ],
    3: [
        { type: 'received', content: 'Deadline xong chưa em?', time: '2023-11-05T10:00:00Z' }
    ]
};

// Biến trạng thái: Người đang chat hiện tại
export const state = {
    currentUserId: 1
};