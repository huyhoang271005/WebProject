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
