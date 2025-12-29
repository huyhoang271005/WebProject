// service.js
import { callAPI } from './api.js'; 

export const ProductService = {
    // Lấy danh sách danh mục
    getCategories: async () => {
        try {
            const res = await callAPI(`/categories`, "GET");
            return (res && res.success) ? res.data.listData : [];
        } catch (e) {
            console.error("Lỗi lấy categories", e);
            return [];
        }
    },

    // Lấy danh sách thương hiệu
    getBrands: async () => {
        try {
            const res = await callAPI(`/brands`, "GET");
            return (res && res.success) ? res.data.listData : [];
        } catch (e) {
            console.error("Lỗi lấy brands", e);
            return [];
        }
    },

    // Lấy danh sách thuộc tính có sẵn
    getAttributes: async () => {
        try {
            const res = await callAPI(`/attributes`, "GET");
            return (res && res.success) ? res.data.listData : [];
        } catch (e) {
            console.error("Lỗi lấy attributes", e);
            return [];
        }
    },

    getProductById: async (id) => {
        try {
            const res = await callAPI(`/auth/admin/products/${id}`, "GET");
            if (res && res.success) {
                return res.data;
            }
            return null;
        } catch (e) {
            console.error("Lỗi lấy chi tiết sản phẩm:", e);
            return null;
        }
    },

    // Tạo sản phẩm mới (Multipart/form-data)
    createProduct: async (formData) => {
        // Lưu ý: callAPI cần hỗ trợ upload file (không set Content-Type JSON thủ công)
        const res = await callAPI(`/auth/admin/products`, "POST", formData, true); 
        return res;
    }
};