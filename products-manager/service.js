import { callAPI } from '../public/api.js';

export const ProductService = {
    // Lấy danh sách categories
    getCategories: async () => {
        const res = await callAPI(`/categories`, "GET");
        console.log("Categories Response:", res);
        
        if (res?.success && res?.data?.listData) {
            return res.data.listData;
        }
        return [];
    },

    // Lấy danh sách brands
    getBrands: async () => {
        const res = await callAPI(`/brands`, "GET");
        console.log("Brands Response:", res);
        
        if (res?.success && res?.data?.listData) {
            return res.data.listData;
        }
        return [];
    },

    // Lấy danh sách attributes
    getAttributes: async () => {
        const res = await callAPI(`/attributes`, "GET");
        console.log("Attributes Response:", res);
        
        if (res?.success && res?.data?.listData) {
            return res.data.listData;
        }
        return [];
    },

    // Lấy chi tiết sản phẩm
    getProductById: async (id) => {
        try {
            const res = await callAPI(`/auth/admin/products/${id}`, "GET");
            console.log("Product Detail Response:", res);
            
            if (res?.success && res?.data) {
                return res.data;
            }
            return null;
        } catch (error) {
            console.error("Lỗi lấy chi tiết sản phẩm:", error);
            return null;
        }
    },

    // Tạo sản phẩm mới
    createProduct: async (formData) => {
        const res = await callAPI(`/auth/admin/products`, "POST", formData, true);
        return res;
    }
};