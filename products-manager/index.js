import { showDialog } from "../dialog/index.js";
import { ProductService } from "./service.js";
import { ProductLogic } from "./logic.js";
import { ProductUI } from "./ui.js";

// Global state
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
    
    console.log('\n========================================');
    console.log('🚀 BẮT ĐẦU XỬ LÝ SUBMIT FORM');
    console.log('========================================\n');

    // VALIDATION CƠ BẢN
    const productName = document.getElementById("productName").value.trim();
    const price = parseFloat(document.getElementById("price").value);
    const priceOriginal = parseFloat(document.getElementById("priceOriginal").value);
    const categoryId = document.getElementById("categoryId").value;
    const brandId = document.getElementById("brandId").value;
    const description = document.getElementById("description").value.trim() || "";

    console.log('📝 Thông tin cơ bản:');
    console.log('  - Tên sản phẩm:', productName);
    console.log('  - Giá bán:', price);
    console.log('  - Giá gốc:', priceOriginal);
    console.log('  - Category ID:', categoryId);
    console.log('  - Brand ID:', brandId);

    if (!productName || !categoryId || !brandId || !price || !priceOriginal) {
        console.error('❌ Thiếu thông tin bắt buộc!');
        await showDialog("error", "Vui lòng điền đầy đủ thông tin bắt buộc!");
        return;
    }

    // DEBUG STATE
    console.log('\n📊 State hiện tại:');
    console.log('  - Selected Attributes:', ProductUI.state.selectedAttributes);
    console.log('  - Variants:', ProductUI.state.variants);
    console.log('  - Main Image:', state.mainImageFile ? state.mainImageFile.name : 'Không có');

    // VALIDATE VARIANTS
    if (ProductUI.state.selectedAttributes.length === 0 && ProductUI.state.variants.length > 0) {
        console.error('❌ Có variants nhưng không có attributes!');
        await showDialog("error", "Lỗi: Có variants nhưng không có attributes!");
        return;
    }

    if (ProductUI.state.selectedAttributes.length > 0 && ProductUI.state.variants.length === 0) {
        console.error('❌ Có attributes nhưng không có variants!');
        await showDialog("error", "Vui lòng tạo variants từ attributes!");
        return;
    }

    // VALIDATE PRICES
    const validation = ProductLogic.validateProduct({
        productName,
        price,
        priceOriginal,
        variants: ProductUI.state.variants
    });

    if (!validation.isValid) {
        console.error('❌ Validation failed:', validation.errors);
        await showDialog("error", validation.errors.join('\n'));
        return;
    }

    console.log('✅ Validation passed!');

    // BUILD PAYLOAD
    console.log('\n🔨 Đang build payload...');
    const payload = ProductLogic.formatProductData(
        {
            productName,
            description,
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
    const imageFiles = [];
    const imageMapping = [];

    // 1. Main image
    if (state.mainImageFile) {
        const fileName = state.mainImageFile.name;
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        payload.productDetailDTO.imageName = nameWithoutExt;
        imageFiles.push(state.mainImageFile);
        imageMapping.push({ type: 'main', name: nameWithoutExt, file: fileName });
    }

    // 2. Variant images
    ProductUI.state.variants.forEach((v, index) => {
        if (v.imageFile) {
            const fileName = v.imageFile.name;
            const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
            payload.variants[index].imageName = nameWithoutExt;
            imageFiles.push(v.imageFile);
            imageMapping.push({ 
                type: 'variant', 
                index, 
                variantName: v.displayName,
                name: nameWithoutExt, 
                file: fileName 
            });
        }
    });

    // Append JSON
    formData.append("productDTO", JSON.stringify(payload));

    // Append images
    imageFiles.forEach(file => {
        formData.append("images", file);
    });

    // COMPREHENSIVE DEBUG LOG
    console.log('\n📦 PAYLOAD STRUCTURE:');
    console.log(JSON.stringify(payload, null, 2));

    console.log('\n🖼️ IMAGE MAPPING:');
    imageMapping.forEach((img, i) => {
        console.log(`  ${i + 1}. [${img.type.toUpperCase()}] ${img.name} (${img.file})`);
        if (img.type === 'variant') {
            console.log(`     └─ Variant: ${img.variantName}`);
        }
    });

    console.log('\n📋 PAYLOAD SUMMARY:');
    console.log('  - Product:', payload.productDetailDTO.productName);
    console.log('  - Categories:', payload.productDetailDTO.categoryId);
    console.log('  - Brand:', payload.productDetailDTO.brandId);
    console.log('  - Attributes:', payload.attributes.length);
    console.log('  - Variants:', payload.variants.length);
    console.log('  - Variant Values:', payload.variantValues.length);
    console.log('  - Images:', imageFiles.length);

    console.log('\n📤 FORMDATA ENTRIES:');
    for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
            console.log(`  - ${key}: File(${value.name}, ${(value.size / 1024).toFixed(2)} KB)`);
        } else {
            console.log(`  - ${key}: ${value.substring(0, 100)}...`);
        }
    }

    // Disable submit button
    const submitBtn = document.getElementById("submitBtn");
    const spinner = document.getElementById("submitSpinner");
    submitBtn.disabled = true;
    spinner.classList.remove("d-none");

    try {
        console.log('\n🌐 SENDING REQUEST TO API...');
        const res = await ProductService.createProduct(formData);
        
        console.log('\n📥 API RESPONSE:');
        console.log('  - Full Response:', res);
        console.log('  - Status:', res?.status);
        console.log('  - Success:', res?.success);
        console.log('  - Message:', res?.message);
        console.log('  - Data:', res?.data);

        if (res && res.success) {
            console.log('\n✅ TẠO SẢN PHẨM THÀNH CÔNG!');
            await showDialog("success", "Tạo sản phẩm thành công!");
            resetForm();
        } else {
            const errorMsg = res?.data?.[0]?.error || res?.message || res?.error || "Có lỗi xảy ra";
            console.error('\n❌ TẠO SẢN PHẨM THẤT BẠI!');
            console.error('  - Error Message:', errorMsg);
            console.error('  - Full Error Object:', res);
            await showDialog("error", `Lỗi: ${errorMsg}`);
        }
    } catch (error) {
        console.error('\n💥 EXCEPTION OCCURRED!');
        console.error('  - Message:', error.message);
        console.error('  - Stack:', error.stack);
        console.error('  - Full Error:', error);
        await showDialog("error", "Có lỗi xảy ra: " + error.message);
    } finally {
        submitBtn.disabled = false;
        spinner.classList.add("d-none");
        console.log('\n========================================');
        console.log('🏁 KẾT THÚC XỬ LÝ');
        console.log('========================================\n');
    }
}

// === RESET FORM ===
function resetForm() {
    console.log('🔄 Resetting form...');
    
    state.variants = [];
    state.mainImageFile = null;
    state.selectedAttributes = [];
    
    ProductUI.state.selectedAttributes = [];
    ProductUI.state.variants = [];
    ProductUI.state.mainImageFile = null;
    
    document.getElementById("productForm").reset();
    document.getElementById("mainImagePreview").innerHTML = "";
    
    const attributesList = document.getElementById("selectedAttributesList");
    if (attributesList) {
        attributesList.innerHTML = "";
    }
    
    const variantsContainer = document.getElementById("variantsContainer");
    if (variantsContainer) {
        variantsContainer.innerHTML = "";
    }
    
    console.log('✅ Form reset complete');
}

// === SETUP EVENT LISTENERS ===
function setupEventListeners() {
    console.log('⚙️ Setting up event listeners...');
    
    // Form submit
    document.getElementById("productForm").onsubmit = handleSave;
    
    // Reset button
    document.getElementById("resetBtn").onclick = resetForm;
    
    // Main image upload
    document.getElementById("mainImage").onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            console.log('🖼️ Main image selected:', file.name);
            state.mainImageFile = file;
            ProductUI.state.mainImageFile = file;
            ProductUI.handleMainImageUpload(file);
        }
    };

    // Category change
    document.getElementById("categoryId").onchange = (e) => {
        const categoryId = e.target.value;
        const brandSelect = document.getElementById("brandId");
        
        console.log('📁 Category changed:', categoryId);
        
        if (!categoryId) {
            brandSelect.innerHTML = '<option value="">-- Chọn danh mục trước --</option>';
            return;
        }

        // Filter brands by category
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

        console.log('  └─ Filtered brands:', filteredBrands.length);
    };
    
    console.log('✅ Event listeners setup complete');
}

// === LOAD INITIAL DATA ===
async function loadInitialData() {
    console.log('\n📥 Loading initial data...');
    
    try {
        const [cats, brands, attrs] = await Promise.all([
            ProductService.getCategories(),
            ProductService.getBrands(),
            ProductService.getAttributes()
        ]);

        state.categories = cats || [];
        state.brands = brands || [];
        state.attributes = attrs || [];

        ProductUI.state.categories = state.categories;
        ProductUI.state.brands = state.brands;
        ProductUI.state.attributes = state.attributes;

        console.log('✅ Data loaded:');
        console.log('  - Categories:', state.categories.length);
        console.log('  - Brands:', state.brands.length);
        console.log('  - Attributes:', state.attributes.length);

        // Populate category dropdown
        const categorySelect = document.getElementById("categoryId");
        categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
        state.categories.forEach(c => {
            categorySelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
        });

        // Initialize brand dropdown
        const brandSelect = document.getElementById("brandId");
        
        if (state.brands.length > 0 && state.brands[0].categoryId === undefined) {
            console.log('  └─ Brands độc lập (không phụ thuộc category)');
            brandSelect.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
            state.brands.forEach(brand => {
                brandSelect.innerHTML += `<option value="${brand.brandId}">${brand.brandName}</option>`;
            });
        } else {
            console.log('  └─ Brands phụ thuộc category');
            brandSelect.innerHTML = '<option value="">-- Chọn danh mục trước --</option>';
        }

        // Render attribute selector
        ProductUI.renderAttributeSelector();

        console.log('✅ Initial data loaded successfully\n');

    } catch (error) {
        console.error('❌ Error loading data:', error);
        await showDialog("error", "Không thể tải dữ liệu. Vui lòng thử lại!");
    }
}

// === INITIALIZE ===
(async function init() {
    console.log('\n🚀 INITIALIZING APPLICATION...\n');
    await loadInitialData();
    setupEventListeners();
    console.log('✅ APPLICATION READY!\n');
})();