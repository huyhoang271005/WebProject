import { callAPI } from '../public/api.js';
export const ProductService = {
    // Lấy danh sách categories
    getInfo: async()=>{
        const ct = await callAPI("/categories");
        const br = await callAPI("/brands");
        const at = await callAPI("/attributes");
        if(ct.success && br.success && at.success){
            return {
                categories: ct.data.listData,
                brands: br.data.listData,
                attributes: at.data.listData
            }
        }
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