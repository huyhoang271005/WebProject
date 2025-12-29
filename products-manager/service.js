// service.js
import { callAPI } from '../public/api.js'; 

export const ProductService = {
    getCategories: async () => {
        const res = await callAPI(`/categories`, "GET");
        return (res && res.success) ? res.data.listData : [];
    },

    getBrands: async () => {
        const res = await callAPI(`/brands`, "GET");
        return (res && res.success) ? res.data.listData : [];
    },

    getAttributes: async () => {
        const res = await callAPI(`/attributes`, "GET");
        return (res && res.success) ? res.data.listData : [];
    },

    getProductById: async (id) => {
        const res = await callAPI(`/auth/admin/products/${id}`, "GET");
        return (res && res.success) ? res.data : null;
    },

    createProduct: async (formData) => {
        return await callAPI(`/auth/admin/products`, "POST", formData, true);
    }
};