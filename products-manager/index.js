import { callAPI } from "../public/api.js";
import { initAddProduct, resetAddForm } from "./add-product.js";

import { initAddProduct } from "./add-product.js";

// Initialize
async function init() {
    // Initialize the Add Product module
    initAddProduct();
}

// Start
init();
