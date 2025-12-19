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

    getProducts: async () => {
        try {
            // Dùng POST để tìm kiếm (body {} rỗng = lấy tất cả)
            const res = await callAPI(`/auth/admin/products/search`, "POST", {}, false);
            
            // Xử lý dữ liệu trả về an toàn
            return res?.data?.listData || res?.data || [];
        } catch (error) {
            console.error("Lỗi lấy danh sách sản phẩm:", error);
            // Nếu lỗi thì trả về mảng rỗng để không crash trang
            return [];
        }
    },

    // Tạo sản phẩm mới
    createProduct: async (productData) => {
        const res = await callAPI(`/auth/admin/products`, "POST", productData, true);
        return res;
    }
};