import { callAPI } from "../public/api.js";

export const ProductService = {
    getAll: async () => {
        const res = await callAPI(`/auth/products`, "POST");
        return res?.data?.listData || [];
    },

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

    // CHỈ CÓ THÊM MỚI - METHOD POST
    create: async (formData) => {
        return await callAPI("/products", "POST", formData, true);
    }
};