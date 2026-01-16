import { callAPI } from "/lib/api.js";

const PAGE_SIZE = 100;

export async function fetchCategories() {
    return await callAPI(`/categories?page=0&size=${PAGE_SIZE}`, "GET");
}

export async function fetchBrands() {
    return await callAPI(`/brands?page=0&size=${PAGE_SIZE}`, "GET");
}

export async function fetchAttributes() {
    return await callAPI(`/attributes?page=0&size=${PAGE_SIZE}`, "GET");
}

export async function createProduct(formData) {
    // Note: formData should be prepared by the caller (appending JSON blob and files)
    return await callAPI("/admin/products", "POST", formData, true); // true = isMultipart
}

export async function getProduct(productId) {
    return await callAPI(`/admin/products/${productId}`, "GET");
}

export async function updateProduct(formData) {
    return await callAPI("/admin/products", "PUT", formData, true); // true = isMultipart
}

export async function deleteProduct(productId) {
    return await callAPI(`/admin/products/${productId}`, "DELETE");
}

export async function updateVariant(formData) {
    return await callAPI("/admin/products/variants", "PUT", formData, true); // true = isMultipart
}

export async function deleteVariant(variantId) {
    return await callAPI(`/admin/products/variants/${variantId}`, "DELETE");
}
