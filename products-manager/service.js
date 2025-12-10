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

    getDetail: async (id) => {
        const res = await callAPI(`/auth/product/${id}`, "GET");
        return res?.success ? res.data : null;
    },

    // Hàm Upload ảnh (dùng chung)
    uploadImage: async (file) => {
        const formData = new FormData();
        formData.append("image", file);
        // true: báo hiệu gửi FormData (Multipart)
        const res = await callAPI("/auth/product/upload-image", "POST", formData, true);
        return res?.success ? res.data : null; // Trả về đường dẫn ảnh trên server
    },

    save: async (payload, isEdit) => {
        const method = isEdit ? "PUT" : "POST";
        return await callAPI("/auth/product", method, payload);
    },

    delete: async (id) => {
        return await callAPI(`/auth/product/${id}`, "DELETE");
    }
};