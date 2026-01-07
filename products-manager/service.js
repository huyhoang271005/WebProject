import { callAPI } from '../public/api.js';

export const ProductService = {
    // Lấy thông tin tổng hợp (categories, brands, attributes)
    getInfo: async () => {
        try {
            const ct = await callAPI("/categories");
            const br = await callAPI("/brands");
            const at = await callAPI("/attributes");
            if (ct.success && br.success && at.success) {
                return {
                    categories: ct.data.listData || [],
                    brands: br.data.listData || [],
                    attributes: at.data.listData || []
                };
            }
            return { categories: [], brands: [], attributes: [] };
        } catch (error) {
            console.error("Lỗi lấy thông tin:", error);
            return { categories: [], brands: [], attributes: [] };
        }
    },

    // Lấy danh sách categories
    getCategories: async () => {
        try {
            const res = await callAPI("/categories");
            return res?.success ? (res.data?.listData || []) : [];
        } catch (error) {
            console.error("Lỗi lấy danh mục:", error);
            return [];
        }
    },

    // Lấy danh sách brands theo category
    getBrandsByCategory: async (categoryId) => {
        try {
            const res = await callAPI("/brands");
            if (res?.success && res.data?.listData) {
                // Lọc brands theo categoryId nếu có
                if (categoryId) {
                    return res.data.listData.filter(brand => brand.categoryId == categoryId);
                }
                return res.data.listData;
            }
            return [];
        } catch (error) {
            console.error("Lỗi lấy thương hiệu:", error);
            return [];
        }
    },

    // Lấy danh sách sản phẩm (admin)
    getProductsList: async (page = 0, size = 20, keyword = null) => {
        try {
            let endpoint = `/admin/products?page=${page}&size=${size}`;
            if (keyword) {
                endpoint += `&keyword=${encodeURIComponent(keyword)}`;
            }
            const res = await callAPI(endpoint, "GET");
            if (res?.success) {
                return {
                    products: res.data?.listData || [],
                    totalPages: res.data?.totalPages || 1,
                    currentPage: page
                };
            }
            return { products: [], totalPages: 1, currentPage: 0 };
        } catch (error) {
            console.error("Lỗi lấy danh sách sản phẩm:", error);
            return { products: [], totalPages: 1, currentPage: 0 };
        }
    },

    // Lấy chi tiết sản phẩm theo ID
    getProductById: async (id) => {
        try {
            const res = await callAPI(`/admin/products/${id}`, "GET");
            return res?.data || null;
        } catch (error) {
            console.error("Lỗi lấy chi tiết sản phẩm:", error);
            return null;
        }
    },

    // Tạo sản phẩm mới
    createProduct: async (productData) => {
        try {
            const res = await callAPI(`/admin/products`, "POST", productData, true);
            return res;
        } catch (error) {
            console.error("Lỗi tạo sản phẩm:", error);
            return { success: false, message: error.message || "Lỗi tạo sản phẩm" };
        }
    },

    // Cập nhật sản phẩm
    updateProduct: async (productData) => {
        try {
            const res = await callAPI(`/admin/products`, "PUT", productData, true);
            return res;
        } catch (error) {
            console.error("Lỗi cập nhật sản phẩm:", error);
            return { success: false, message: error.message || "Lỗi cập nhật sản phẩm" };
        }
    },

    // Xóa sản phẩm
    deleteProduct: async (id, publicId = "") => {
        try {
            const endpoint = publicId 
                ? `/admin/products/${id}?public_id=${publicId}`
                : `/admin/products/${id}`;
            const res = await callAPI(endpoint, "DELETE");
            return res;
        } catch (error) {
            console.error("Lỗi xóa sản phẩm:", error);
            return { success: false, message: error.message || "Lỗi xóa sản phẩm" };
        }
    }
};