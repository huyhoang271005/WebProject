import { callAPI } from '../public/api.js';

export const ProductService = {
    // Lấy danh sách categories
    getCategories: async () => {
        const res = await callAPI(`/auth/categories`, "GET");
        return res?.data?.listData || [];
    },

    // Lấy danh sách brands
    getBrands: async () => {
        const res = await callAPI(`/auth/brands`, "GET");
        return res?.data?.listData || [];
    },

    // Lấy danh sách attributes
    getAttributes: async () => {
        const res = await callAPI(`/auth/attributes`, "GET");
        return res?.data?.listData || [];
    },

    createProduct: async (productData) => {
        const res = await callAPI(`/auth/products`, "POST", productData);
        return res;
    }
};