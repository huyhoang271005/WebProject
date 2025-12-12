import { callAPI } from "../public/api.js";

const PAGE_SIZE = 100;

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

    save: async (formData) => {
        return await callAPI("/auth/products", "POST", formData, true);
    },
};