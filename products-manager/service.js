import { callAPI } from "../public/api.js";

const PAGE_SIZE = 100;

export const ProductService = {
    getAll: async () => {
        const res = await callAPI(`/products`, "GET");
        return res?.data?.listData || [];
    },

    getCategories: async () => {
        const res = await callAPI(`/categories`, "GET");
        return res?.data?.listData || [];
    },

    getBrands: async () => {
        const res = await callAPI(`/brands`, "GET");
        return res?.data?.listData || [];
    },

    getAttributes: async () => {
        const res = await callAPI(`/attributes`, "GET");
        return res?.data?.listData || [];
    },

    save: async (formData) => {
        return await callAPI("/products", "POST", formData, true);
    },

    delete: async (id) => {
        return await callAPI(`/products/${id}`, "DELETE");
    }
};