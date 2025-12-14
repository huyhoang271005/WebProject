// import { showDialog } from "../dialog/index.js";
// import { ProductService } from "./service.js";
// import { ProductLogic } from "./logic.js";
// import { ProductUI } from "./ui.js";

// let state = {
//     products: [],
//     categories: [],
//     brands: [],
//     attributes: [],
//     variants: [],
//     selectedAttributes: [],
//     mainImageFile: null
// };

// // === HANDLER SAVE ===
// async function handleSave(e) {
//     e.preventDefault();

//     // VALIDATION
//     const productName = document.getElementById("productName").value.trim();
//     const price = parseFloat(document.getElementById("price").value);
//     const priceOriginal = parseFloat(document.getElementById("priceOriginal").value);
//     const categoryId = document.getElementById("categoryId").value;
//     const brandId = document.getElementById("brandId").value;

//     if (!productName || !categoryId || !brandId || !price || !priceOriginal) {
//         await showDialog("error", "Vui lòng điền đầy đủ thông tin bắt buộc!");
//         return;
//     }

//     // DEBUG: Kiểm tra state trước khi submit
//     console.log('=== STATE BEFORE SUBMIT ===');
//     console.log('Selected Attributes:', ProductUI.state.selectedAttributes);
//     console.log('Variants:', ProductUI.state.variants);

//     // Validate: Phải có attributes và variants nếu tạo sản phẩm có biến thể
//     if (ProductUI.state.selectedAttributes.length === 0 && ProductUI.state.variants.length > 0) {
//         await showDialog("error", "Lỗi: Có variants nhưng không có attributes!");
//         return;
//     }

//     if (ProductUI.state.selectedAttributes.length > 0 && ProductUI.state.variants.length === 0) {
//         await showDialog("error", "Vui lòng tạo variants từ attributes!");
//         return;
//     }

//     // Validate prices
//     const validation = ProductLogic.validateProduct({
//         productName,
//         price,
//         priceOriginal,
//         variants: ProductUI.state.variants
//     });

//     if (!validation.isValid) {
//         await showDialog("error", validation.errors.join('\n'));
//         return;
//     }

//     // BUILD PAYLOAD
//     const payload = ProductLogic.formatProductData(
//         {
//             productName,
//             description: document.getElementById("description").value.trim() || "",
//             price,
//             priceOriginal,
//             categoryId,
//             brandId
//         },
//         ProductUI.state.selectedAttributes,
//         ProductUI.state.variants
//     );

//     // BUILD FORMDATA
//     const formData = new FormData();
    
//     // Tạo mảng chứa tất cả các file sẽ upload theo thứ tự
//     const imageFiles = [];
//     const imageNames = []; // Để debug
    
//     // 1. Main image (nếu có)
//     if (state.mainImageFile) {
//         const fileName = state.mainImageFile.name;
//         const nameWithoutExt = fileName.includes('.')
//             ? fileName.substring(0, fileName.lastIndexOf('.'))
//             : fileName;
        
//         payload.productDetailDTO.imageName = nameWithoutExt;
//         imageFiles.push(state.mainImageFile);
//         imageNames.push(nameWithoutExt);
//     }
    
//     // 2. Variant images (theo thứ tự trong variants array)
//     ProductUI.state.variants.forEach((v, index) => {
//         if (v.imageFile) {
//             const fileName = v.imageFile.name;
//             const nameWithoutExt = fileName.includes('.')
//                 ? fileName.substring(0, fileName.lastIndexOf('.'))
//                 : fileName;
            
//             // Đảm bảo imageName trong variant đã được set đúng
//             payload.variants[index].imageName = nameWithoutExt;
//             imageFiles.push(v.imageFile);
//             imageNames.push(nameWithoutExt);
//         }
//     });
    
//     // Append JSON trước
//     formData.append("productDTO", JSON.stringify(payload));
    
//     // Append images theo đúng thứ tự
//     imageFiles.forEach(file => {
//         formData.append("images", file);
//     });

//     // DEBUG LOG
//     console.log("=== PAYLOAD ===");
//     console.log(JSON.stringify(payload, null, 2));
//     console.log("\n=== IMAGE MAPPING ===");
//     console.log("Main image:", payload.productDetailDTO.imageName || "không có");
//     payload.variants.forEach((v, i) => {
//         console.log(`Variant ${i}:`, v.imageName || "không có ảnh");
//     });
//     console.log("\n=== FILES IN FORMDATA ===");
//     imageNames.forEach((name, i) => {
//         console.log(`${i + 1}. ${name}`);
//     });
//     console.log("\n=== FORMDATA ENTRIES ===");
//     for (let [key, value] of formData.entries()) {
//         console.log(key, value instanceof File ? `File(${value.name})` : value);
//     }

//     // Disable submit button
//     const submitBtn = document.getElementById("submitBtn");
//     const spinner = document.getElementById("submitSpinner");
//     submitBtn.disabled = true;
//     spinner.classList.remove("d-none");

//     try {
//         // QUAN TRỌNG: Gửi FormData, KHÔNG phải JSON
//         const res = await ProductService.createProduct(formData);
//         console.log("=== RESPONSE ===", res);
        
//         if (res && res.success) {
//             await showDialog("success", "Tạo sản phẩm thành công!");
//             resetForm();
//         } else {
//             const errorMsg = res?.data?.[0]?.error || res?.message || "Có lỗi xảy ra";
//             await showDialog("error", errorMsg);
//             console.error("Error details:", res);
//         }
//     } catch (error) {
//         console.error("Error:", error);
//         await showDialog("error", "Có lỗi xảy ra khi tạo sản phẩm: " + error.message);
//     } finally {
//         // Re-enable submit button
//         submitBtn.disabled = false;
//         spinner.classList.add("d-none");
//     }
// }

// function resetForm() {
//     state.variants = [];
//     state.mainImageFile = null;
//     state.selectedAttributes = [];
//     ProductUI.state.selectedAttributes = [];
//     ProductUI.state.variants = [];
//     ProductUI.state.mainImageFile = null;
    
//     document.getElementById("productForm").reset();
//     document.getElementById("selectedAttributesList").innerHTML = "";
//     document.getElementById("variantsContainer").innerHTML = "";
//     document.getElementById("mainImagePreview").innerHTML = "";
// }

// function setupEventListeners() {
//     // Form submit
//     document.getElementById("productForm").onsubmit = handleSave;
    
//     // Reset button
//     document.getElementById("resetBtn").onclick = resetForm;
    
//     // Main image upload
//     document.getElementById("mainImage").onchange = (e) => {
//         const file = e.target.files[0];
//         if (file) {
//             state.mainImageFile = file;
//             ProductUI.handleMainImageUpload(file);
//         }
//     };

//     // Category change - update brands
//     document.getElementById("categoryId").onchange = (e) => {
//         const categoryId = e.target.value;
//         const brandSelect = document.getElementById("brandId");
        
//         if (!categoryId) {
//             brandSelect.innerHTML = '<option value="">-- Chọn danh mục trước --</option>';
//             return;
//         }

//         // Filter brands by category (nếu có categoryId trong brand object)
//         // Nếu không có categoryId, hiển thị tất cả brands
//         let filteredBrands = state.brands;
//         if (state.brands.length > 0 && state.brands[0].categoryId !== undefined) {
//             filteredBrands = state.brands.filter(b => b.categoryId === categoryId);
//         }

//         brandSelect.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
        
//         if (filteredBrands.length === 0) {
//             brandSelect.innerHTML += '<option value="" disabled>Không có thương hiệu nào</option>';
//         } else {
//             filteredBrands.forEach(brand => {
//                 brandSelect.innerHTML += `<option value="${brand.brandId}">${brand.brandName}</option>`;
//             });
//         }

//         console.log('Filtered brands:', filteredBrands);
//     };
// }

// async function loadInitialData() {
//     try {
//         const [cats, brands, attrs] = await Promise.all([
//             ProductService.getCategories(),
//             ProductService.getBrands(),
//             ProductService.getAttributes()
//         ]);

//         state.categories = cats || [];
//         state.brands = brands || [];
//         state.attributes = attrs || [];

//         // Update UI state
//         ProductUI.state.categories = state.categories;
//         ProductUI.state.brands = state.brands;
//         ProductUI.state.attributes = state.attributes;

//         // DEBUG: Log để kiểm tra data structure
//         console.log('=== LOADED DATA ===');
//         console.log('Categories:', state.categories);
//         console.log('Brands:', state.brands);
//         console.log('Attributes:', state.attributes);
        
//         if (state.brands.length > 0) {
//             console.log('Brand structure example:', state.brands[0]);
//         }

//         // Populate category dropdown
//         const categorySelect = document.getElementById("categoryId");
//         categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
//         state.categories.forEach(c => {
//             categorySelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
//         });

//         // Initialize brand dropdown
//         const brandSelect = document.getElementById("brandId");
        
//         // OPTION 1: Nếu brands không phụ thuộc vào category, hiển thị tất cả
//         if (state.brands.length > 0 && state.brands[0].categoryId === undefined) {
//             console.log('Brands không có categoryId, hiển thị tất cả');
//             brandSelect.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
//             state.brands.forEach(brand => {
//                 brandSelect.innerHTML += `<option value="${brand.brandId}">${brand.brandName}</option>`;
//             });
//         } 
//         // OPTION 2: Nếu brands phụ thuộc vào category, yêu cầu chọn category trước
//         else {
//             console.log('Brands có categoryId, cần chọn category trước');
//             brandSelect.innerHTML = '<option value="">-- Chọn danh mục trước --</option>';
//         }

//         // Render attribute selector
//         ProductUI.renderAttributeSelector();

//     } catch (error) {
//         console.error("Error loading data:", error);
//         await showDialog("error", "Không thể tải dữ liệu. Vui lòng thử lại!");
//     }
// }

// // Initialize
// (async function init() {
//     await loadInitialData();
//     setupEventListeners();
// })();

import { showDialog } from "../dialog/index.js";
import { ProductService } from "./service.js";
import { ProductLogic } from "./logic.js";
import { ProductUI } from "./ui.js";

let state = {
    products: [],
    categories: [],
    brands: [],
    attributes: [],
    variants: [],
    selectedAttributes: [],
    mainImageFile: null
};

// === HANDLER SAVE ===
async function handleSave(e) {
    e.preventDefault();

    // VALIDATION
    const productName = document.getElementById("productName").value.trim();
    const price = parseFloat(document.getElementById("price").value);
    const priceOriginal = parseFloat(document.getElementById("priceOriginal").value);
    const categoryId = document.getElementById("categoryId").value;
    const brandId = document.getElementById("brandId").value;

    if (!productName || !categoryId || !brandId || !price || !priceOriginal) {
        await showDialog("error", "Vui lòng điền đầy đủ thông tin bắt buộc!");
        return;
    }

    // DEBUG: Kiểm tra state trước khi submit
    console.log('=== STATE BEFORE SUBMIT ===');
    console.log('Selected Attributes:', ProductUI.state.selectedAttributes);
    console.log('Variants:', ProductUI.state.variants);

    // Validate: Phải có attributes và variants nếu tạo sản phẩm có biến thể
    if (ProductUI.state.selectedAttributes.length === 0 && ProductUI.state.variants.length > 0) {
        await showDialog("error", "Lỗi: Có variants nhưng không có attributes!");
        return;
    }

    if (ProductUI.state.selectedAttributes.length > 0 && ProductUI.state.variants.length === 0) {
        await showDialog("error", "Vui lòng tạo variants từ attributes!");
        return;
    }

    // Validate prices
    const validation = ProductLogic.validateProduct({
        productName,
        price,
        priceOriginal,
        variants: ProductUI.state.variants
    });

    if (!validation.isValid) {
        await showDialog("error", validation.errors.join('\n'));
        return;
    }

    // BUILD PAYLOAD
    const payload = ProductLogic.formatProductData(
        {
            productName,
            description: document.getElementById("description").value.trim() || "",
            price,
            priceOriginal,
            categoryId,
            brandId
        },
        ProductUI.state.selectedAttributes,
        ProductUI.state.variants
    );

    // BUILD FORMDATA
    const formData = new FormData();
    
    // FIX QUAN TRỌNG: Đóng gói JSON vào Blob với type application/json
    const jsonBlob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    formData.append("productDTO", jsonBlob);
    
    // Tạo mảng chứa tất cả các file sẽ upload theo thứ tự
    const imageFiles = [];
    const imageNames = []; // Để debug
    
    // 1. Main image (nếu có)
    if (state.mainImageFile) {
        const fileName = state.mainImageFile.name;
        const nameWithoutExt = fileName.includes('.')
            ? fileName.substring(0, fileName.lastIndexOf('.'))
            : fileName;
        
        // Cập nhật lại imageName trong payload nếu cần (mặc dù payload đã stringify ở trên, 
        // nhưng backend chủ yếu dùng file, logic này để đảm bảo consistency nếu cần thiết kế lại)
        imageFiles.push(state.mainImageFile);
        imageNames.push(nameWithoutExt);
    }
    
    // 2. Variant images (theo thứ tự trong variants array)
    ProductUI.state.variants.forEach((v, index) => {
        if (v.imageFile) {
            const fileName = v.imageFile.name;
            const nameWithoutExt = fileName.includes('.')
                ? fileName.substring(0, fileName.lastIndexOf('.'))
                : fileName;
            
            imageFiles.push(v.imageFile);
            imageNames.push(nameWithoutExt);
        }
    });
    
    // Append images theo đúng thứ tự
    imageFiles.forEach(file => {
        formData.append("images", file);
    });

    // DEBUG LOG
    console.log("=== PAYLOAD ===");
    console.log(JSON.stringify(payload, null, 2));
    console.log("\n=== FORMDATA ENTRIES ===");
    for (let [key, value] of formData.entries()) {
        console.log(key, value instanceof File ? `File(${value.name})` : value);
    }

    // Disable submit button
    const submitBtn = document.getElementById("submitBtn");
    const spinner = document.getElementById("submitSpinner");
    submitBtn.disabled = true;
    spinner.classList.remove("d-none");

    try {
        const res = await ProductService.createProduct(formData);
        console.log("=== RESPONSE ===", res);
        
        if (res && res.success) {
            await showDialog("success", "Tạo sản phẩm thành công!");
            resetForm();
        } else {
            const errorMsg = res?.data?.[0]?.error || res?.message || "Có lỗi xảy ra";
            await showDialog("error", errorMsg);
            console.error("Error details:", res);
        }
    } catch (error) {
        console.error("Error:", error);
        await showDialog("error", "Có lỗi xảy ra khi tạo sản phẩm: " + error.message);
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        spinner.classList.add("d-none");
    }
}

function resetForm() {
    state.variants = [];
    state.mainImageFile = null;
    state.selectedAttributes = [];
    ProductUI.state.selectedAttributes = [];
    ProductUI.state.variants = [];
    ProductUI.state.mainImageFile = null;
    
    document.getElementById("productForm").reset();
    document.getElementById("selectedAttributesList").innerHTML = "";
    document.getElementById("variantsContainer").innerHTML = "";
    document.getElementById("mainImagePreview").innerHTML = "";
}

function setupEventListeners() {
    // Form submit
    document.getElementById("productForm").onsubmit = handleSave;
    
    // Reset button
    document.getElementById("resetBtn").onclick = resetForm;
    
    // Main image upload
    document.getElementById("mainImage").onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            state.mainImageFile = file;
            ProductUI.handleMainImageUpload(file);
        }
    };

    // Category change - update brands
    document.getElementById("categoryId").onchange = (e) => {
        const categoryId = e.target.value;
        const brandSelect = document.getElementById("brandId");
        
        if (!categoryId) {
            brandSelect.innerHTML = '<option value="">-- Chọn danh mục trước --</option>';
            return;
        }

        // Filter brands by category (nếu có categoryId trong brand object)
        let filteredBrands = state.brands;
        if (state.brands.length > 0 && state.brands[0].categoryId !== undefined) {
            filteredBrands = state.brands.filter(b => b.categoryId === categoryId);
        }

        brandSelect.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
        
        if (filteredBrands.length === 0) {
            brandSelect.innerHTML += '<option value="" disabled>Không có thương hiệu nào</option>';
        } else {
            filteredBrands.forEach(brand => {
                brandSelect.innerHTML += `<option value="${brand.brandId}">${brand.brandName}</option>`;
            });
        }
    };
}

async function loadInitialData() {
    try {
        const [cats, brands, attrs] = await Promise.all([
            ProductService.getCategories(),
            ProductService.getBrands(),
            ProductService.getAttributes()
        ]);

        state.categories = cats || [];
        state.brands = brands || [];
        state.attributes = attrs || [];

        // Update UI state
        ProductUI.state.categories = state.categories;
        ProductUI.state.brands = state.brands;
        ProductUI.state.attributes = state.attributes;

        // Populate category dropdown
        const categorySelect = document.getElementById("categoryId");
        categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
        state.categories.forEach(c => {
            categorySelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
        });

        // Initialize brand dropdown
        const brandSelect = document.getElementById("brandId");
        if (state.brands.length > 0 && state.brands[0].categoryId === undefined) {
            brandSelect.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
            state.brands.forEach(brand => {
                brandSelect.innerHTML += `<option value="${brand.brandId}">${brand.brandName}</option>`;
            });
        } else {
            brandSelect.innerHTML = '<option value="">-- Chọn danh mục trước --</option>';
        }

        // Render attribute selector
        ProductUI.renderAttributeSelector();

    } catch (error) {
        console.error("Error loading data:", error);
        await showDialog("error", "Không thể tải dữ liệu. Vui lòng thử lại!");
    }
}

// Initialize
(async function init() {
    await loadInitialData();
    setupEventListeners();
})();