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

    getProductById: async (id) => {
        try {
            const res = await callAPI(`/auth/admin/products/${id}`, "GET");
            return res?.data || null;
        } catch (error) {
            console.error("Lỗi lấy chi tiết sản phẩm:", error);
            return null;
        }
    },

    createProduct: async (productData) => {
        const res = await callAPI(`/auth/admin/products`, "POST", productData, true);
        return res;
    }
};