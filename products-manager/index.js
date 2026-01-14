import { callAPI } from "/lib/api.js";
import { initAddProduct } from "/products-manager/add-product.js";
import { initSearch } from "/products-manager/edit-product.js";

// Initialize
async function init() {
    console.log("Index.js: init() called");
    try {
        // Initialize the Add Product module
        await initAddProduct();
        console.log("Index.js: initAddProduct() called");

        // Initialize Search & Edit
        initSearch();
        console.log("Index.js: initSearch() called");
    } catch (error) {
        console.error("Index.js: Error initializing:\", error");
    }
}

// Start
console.log("Index.js: Loaded");
init();
