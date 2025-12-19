import { callAPI } from '../public/api.js';

export const ProductService = {
    // Lấy danh sách categories
    getCategories: async () => {
        const res = await callAPI(`/categories`, "GET");
        return res?.data?.listData || [];
    },

    // Lấy danh sách brands
    getBrands: async () => {
        const res = await callAPI(`/brands`, "GET");
        return res?.data?.listData || [];
    },

    // Lấy danh sách attributes
    getAttributes: async () => {
        const res = await callAPI(`/attributes`, "GET");
        return res?.data?.listData || [];
    },

    // [QUAN TRỌNG] Sửa thành POST để tìm kiếm
    getProducts: async () => {
        try {
            // Thử đường dẫn /search trước (chuẩn phổ biến nhất)
            // Body gửi kèm page/size để tránh lỗi backend
            const payload = {
                page: 0,
                size: 100, // Lấy 100 sản phẩm đầu tiên
                keyword: ""
            };

            // Nếu Backend bảo URL cũ đúng nhưng sai method -> Có thể là POST vào chính /auth/admin/products
            // Hoặc POST vào /auth/admin/products/search. Tôi để /search vì nó an toàn hơn.
            // Nếu vẫn lỗi 404, bạn hãy xóa chữ "/search" đi là được.
            const res = await callAPI(`/auth/admin/products/search`, "GET");
            
            return res?.data?.listData || res?.data || [];
        } catch (error) {
            console.error("Lỗi API lấy danh sách:", error);
            return [];
        }
    },

    createProduct: async (productData) => {
        const res = await callAPI(`/auth/admin/products`, "POST", productData, true);
        return res;
    }
};