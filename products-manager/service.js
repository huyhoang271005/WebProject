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

    // Lấy DS sản phẩm
    getProducts: async () => {
        const res = await callAPI(`/auth/admin/products/6786aedf-aa81-44ef-b28f-06abff1b5c1c`, "GET");
        return res?.data?.listData || res?.data || [];
    },

    createProduct: async (productData) => {
        const res = await callAPI(`/auth/admin/products`, "POST", productData, true);
        return res;
    }
};