import { callAPI } from '../public/api.js';

export const ProductService = {
    getCategories: async () => {
        const res = await callAPI(`/auth/categories`, "GET");
        return res?.data?.listData || [];
    },

    getBrands: async () => {
        const res = await callAPI(`/auth/brands`, "GET");
        return res?.data?.listData || [];
    },

    getAttributes: async () => {
        const res = await callAPI(`/auth/attributes`, "GET");
        return res?.data?.listData || [];
    },

    createProduct: async (productData) => {
        const res = await callAPI(`/products`, "POST", productData);
        return res;
    }
};