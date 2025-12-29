import { callAPI } from '../public/api.js';
let categories, brands, attributes;
export const ProductService = {
    // Lấy danh sách categories
    getInfo: async()=>{
        const ct = await callAPI("categories");
        const br = await callAPI("brands");
        const at = await callAPI("attributes");
        if(ct.success && br.success && at.success){
            categories = ct.data.listDatal;
            brands = br.data.listData;
            attributes = at.data.listData;
        }
    },
    getCategories: async () => {
        return categories;
    },

    // Lấy danh sách brands
    getBrands: async () => {
        return brands;
    },

    // Lấy danh sách attributes
    getAttributes: async () => {
        return attributes;
    },

    getProductById: async (id) => {
        try {
            const res = await callAPI(`/auth/admin/products/${id}`, "GET");
            return res?.data || null;
        } catch (error) {
            console.error("Lỗi lấy chi tiết sản phẩm:", error);
            return null;
        }
    },

    createProduct: async (productData) => {
        const res = await callAPI(`/auth/admin/products`, "POST", productData, true);
        return res;
    }
};