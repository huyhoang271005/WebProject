// service.js
import { callAPI } from '../public/api.js'; 

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

    // Lấy danh sách thuộc tính
    getAttributes: async () => {
        try {
            const res = await callAPI(`/attributes`, "GET");
            return (res && res.success) ? res.data.listData : [];
        } catch (e) {
            console.error("Lỗi lấy attributes", e);
            return [];
        }
    },

    // Lấy chi tiết sản phẩm (cho tính năng Edit sau này)
    getProductById: async (id) => {
        try {
            const res = await callAPI(`/auth/admin/products/${id}`, "GET");
            return (res && res.success) ? res.data : null;
        } catch (e) {
            console.error("Lỗi lấy chi tiết sản phẩm:", e);
            return null;
        }
    },

    // Tạo sản phẩm mới
    createProduct: async (formData) => {
        // callAPI cần tự động handle Content-Type cho FormData
        const res = await callAPI(`/auth/admin/products`, "POST", formData, true); 
        return res;
    }
};