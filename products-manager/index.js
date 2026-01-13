import { callAPI } from "../lib/api.js";
import { initAddProduct } from "./add-product.js";

// Initialize
async function init() {
    console.log("Index.js: init() called");
    try {
        // Initialize the Add Product module
        initAddProduct();
        console.log("Index.js: initAddProduct() called");
    } catch (error) {
        console.error("Index.js: Error initializing add product:", error);
    }
}

// Start
console.log("Index.js: Loaded");
init();
