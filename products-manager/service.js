import { callAPI } from "../public/api.js";

const PAGE_SIZE = 100;

export const ProductService = {
    getAll: async () => {
        const res = await callAPI(`/auth/products?page=0&size=${PAGE_SIZE}`, "GET");
        return res?.data?.listData || [];
    },

    getCategories: async () => {
        const res = await callAPI(`/auth/categories?page=0&size=${PAGE_SIZE}`, "GET");
        return res?.data?.listData || [];
    },

    getBrands: async () => {
        const res = await callAPI(`/auth/brands?page=0&size=${PAGE_SIZE}`, "GET");
        return res?.data?.listData || [];
    },

    getAttributes: async () => {
        const res = await callAPI(`/auth/attributes?page=0&size=${PAGE_SIZE}`, "GET");
        return res?.data?.listData || [];
    },

    save: async (formData) => {
        return await callAPI("/auth/product", "POST", formData, true);
    },

    delete: async (id) => {
        return await callAPI(`/auth/product/${id}`, "DELETE");
    }
};