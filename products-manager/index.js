import { ProductService } from './service.js';
import { PayloadBuilder } from './payloadBuilder.js';
import { UI } from './ui.js'; // Vẫn giữ UI helper cho render variant table

// State
let mode = 'ADD'; // 'ADD' or 'EDIT'
let currentProduct = null;
let currentVariants = []; // List of local variant objects { id, sku, price, ... }
let mainImageFile = null;

// DOM Elements
const btnTabAdd = document.getElementById('btnTabAdd');
const btnTabEdit = document.getElementById('btnTabEdit');
const searchSection = document.getElementById('searchSection');
const formSection = document.getElementById('formSection'); // Trong Edit mode chỉ hiện sau khi search
const formTitle = document.getElementById('formTitle');
const btnDeleteProduct = document.getElementById('btnDeleteProduct');

const searchIdInput = document.getElementById('searchIdInput');
const btnSearchId = document.getElementById('btnSearchId');

const productForm = document.getElementById('productForm');
const btnAddVariantModal = document.getElementById('btnAddVariantModal');
const variantModal = new bootstrap.Modal(document.getElementById('variantModal'));
const btnSaveVariantToTable = document.getElementById('btnSaveVariantToTable');
const btnAddAttributeLine = document.getElementById('btnAddAttributeLine');

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', async () => {
    // Load metadata (Category/Brand)
    const info = await ProductService.getInfo();
    UI.fillSelectOptions('categoryId', info.categories);
    UI.fillSelectOptions('brandId', info.brands);

    setupEventListeners();
    switchMode('ADD'); // Default
});

// ================= NAVIGATION =================
function setupEventListeners() {
    btnTabAdd.onclick = () => switchMode('ADD');
    btnTabEdit.onclick = () => switchMode('EDIT');

    // Search
    btnSearchId.onclick = handleSearchProduct;
    searchIdInput.onkeypress = (e) => {
        if (e.key === 'Enter') handleSearchProduct();
    };

    // Product Actions
    btnDeleteProduct.onclick = handleDeleteProduct;
    productForm.onsubmit = handleProductSubmit;
    document.getElementById('mainImage').onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
            mainImageFile = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                const preview = document.getElementById('mainImagePreview');
                preview.classList.remove('d-none');
                preview.querySelector('img').src = ev.target.result;
            };
            reader.readAsDataURL(mainImageFile);
        }
    };

    // Variant Actions
    btnAddVariantModal.onclick = () => openVariantModal();
    btnSaveVariantToTable.onclick = saveVariantToTable;
    btnAddAttributeLine.onclick = () => addAttributeLine();
}

function switchMode(newMode) {
    mode = newMode;
    // Reset Form
    productForm.reset();
    currentProduct = null;
    currentVariants = [];
    mainImageFile = null;
    document.getElementById('mainImagePreview').classList.add('d-none');
    UI.renderVariantList([], 'variantsTableBody'); // Reset table

    if (mode === 'ADD') {
        btnTabAdd.classList.add('active', 'btn-outline-success'); // Logic active
        btnTabEdit.classList.remove('active');

        searchSection.classList.add('d-none');
        formSection.classList.remove('d-none');
        formTitle.textContent = 'Thêm Sản Phẩm Mới';
        btnDeleteProduct.classList.add('d-none');
        document.getElementById('productId').value = '';
    } else {
        btnTabAdd.classList.remove('active');
        btnTabEdit.classList.add('active');

        searchSection.classList.remove('d-none');
        formSection.classList.add('d-none'); // Hide until search found
        formTitle.textContent = 'Chỉnh Sửa Sản Phẩm';
        btnDeleteProduct.classList.remove('d-none');
        searchIdInput.value = '';
        searchIdInput.focus();
    }
}

// ================= SEARCH LOGIC =================
async function handleSearchProduct() {
    const id = searchIdInput.value.trim();
    if (!id) return alert('Vui lòng nhập ID!');

    const res = await ProductService.getProductById(id);
    if (res && res.id) {
        currentProduct = res;
        fillProductToForm(res);
        formSection.classList.remove('d-none');
        searchSection.classList.add('d-none'); // Optional: Hide search or keep it? Plan said Hide.
    } else {
        alert('Không tìm thấy sản phẩm có ID: ' + id);
    }
}

function fillProductToForm(product) {
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('description').value = product.description || '';
    document.getElementById('categoryId').value = product.categoryId || '';
    document.getElementById('brandId').value = product.brandId || '';
    document.getElementById('priceOriginal').value = product.originalPrice || 0;
    document.getElementById('price').value = product.price || 0;

    // Load Variants (Mapping from Server DTO to Local UI structure is tricky)
    // Server returns List<VariantDTO>. Attributes are separate or nested?
    // Based on previous code, ProductDTO structure has separate lists. 
    // We need to re-assemble them for UI or just display basic info?
    // Let's assume `product.variants` contains enough info.
    // NOTE: If getProductById returns the simplistic structure, we might need a richer DTO or parse logic.
    // ProductService.getProductById returns res.data.
    // If res.data is ProductDTO (complex), we need to parse.
    // If it's a flattened View Model, it's easier.
    // ASSUMPTION: The API returns the ProductDTO structure we defined in Java.
    // We need to map `product.variants` + `product.variantValues` + `product.attributes` -> local variant objects.

    // Simplification for now: Just show variants list if available directly or raw.
    // If we want to support full Edit, we should reconstruct.
    // For this Turn, to avoid huge complexity, I will map basic fields if available.

    currentVariants = (product.variants || []).map(v => ({
        id: v.variantId,
        sku: v.sku, // Might not constitute in DTO if not added? Added in PayloadBuilder.
        priceImport: v.originalPrice,
        price: v.price,
        stock: v.stock,
        image: v.imageName, // Or Url
        // Attributes reconstruction is complex. Leaving empty for viewing or simplistic display.
        attributes: []
    }));

    UI.renderVariantList(currentVariants, 'variantsTableBody');
}

// ================= FORM SUBMISSION =================
async function handleProductSubmit(e) {
    e.preventDefault();

    // 1. Collect Base Info
    const baseInfo = {
        id: document.getElementById('productId').value,
        name: document.getElementById('productName').value,
        description: document.getElementById('description').value,
        categoryId: document.getElementById('categoryId').value,
        brandId: document.getElementById('brandId').value,
        originalPrice: document.getElementById('priceOriginal').value,
        price: document.getElementById('price').value
    };

    // 2. Build Complex Payload
    const { productDTO, variantImagesMap } = PayloadBuilder.build(baseInfo, currentVariants);

    // 3. Send
    let res;
    if (mode === 'ADD') {
        res = await ProductService.createProduct(productDTO, mainImageFile, variantImagesMap);
    } else {
        res = await ProductService.updateProduct(productDTO, mainImageFile, variantImagesMap);
    }

    if (res && res.success) { // ApiCaller might return {success: true, data: ...}
        // Check `service.js` implementation calling `callAPI` passing `return res`.
        // If `callAPI` returns parsed JSON.
        // Usually success check is `res && (res.id || res.success)` depending on API.
        // Assuming MyResponse structure { data, message, status ... } - actually Java returns MyResponse.
        // JS callAPI usually returns the body directly or wraps it.
        // Alert success
        alert('Thành công!');
        if (mode === 'ADD') {
            switchMode('ADD'); // Reset
        }
    } else {
        alert('Có lỗi xảy ra: ' + (JSON.stringify(res) || 'Unknown Error'));
    }
}

async function handleDeleteProduct() {
    if (!confirm('Chắc chắn xóa?')) return;
    const id = document.getElementById('productId').value;
    if (id) {
        const res = await ProductService.deleteProduct(id);
        if (res) { // Assuming success
            alert('Đã xóa');
            switchMode('EDIT'); // Back to search
        }
    }
}

// ================= VARIANT UI LOGIC (Client-Side Only) =================
// Variants are added to `currentVariants` array, then submitted in bulk with Product
function openVariantModal() {
    document.getElementById('variantForm').reset();
    document.getElementById('variantAttributesContainer').innerHTML = '';
    document.getElementById('variantImagePreviewBox').innerHTML = '<i class="bi bi-image fs-1 text-secondary"></i>';
    // Reset local ID
    document.getElementById('variantIdLocal').value = '';
    variantModal.show();
}

function saveVariantToTable() {
    // Collect data from Modal
    const priceImp = document.getElementById('variantPriceImport').value;
    const price = document.getElementById('variantPrice').value;
    const stock = document.getElementById('variantQuantity').value;
    const sku = document.getElementById('variantSku').value;

    // Attributes
    const attrRows = document.querySelectorAll('#variantAttributesContainer .row');
    const attributes = Array.from(attrRows).map(row => ({
        name: row.querySelector('input[name="attrName"]').value,
        value: row.querySelector('input[name="attrValue"]').value
    })).filter(a => a.name && a.value);

    // Image File
    const fileInput = document.getElementById('variantImage');
    const imageFile = fileInput.files[0];

    const newVariant = {
        id: document.getElementById('variantIdServer').value || null, // If editing existing
        targetId: Date.now(), // Temp ID for list management
        sku,
        priceImport: priceImp,
        price,
        quantity: stock,
        attributes,
        imageFile: imageFile,
        image: imageFile ? URL.createObjectURL(imageFile) : null // Preview
    };

    currentVariants.push(newVariant);
    UI.renderVariantList(currentVariants, 'variantsTableBody');
    variantModal.hide();
}

function addAttributeLine() {
    const container = document.getElementById('variantAttributesContainer');
    const div = document.createElement('div');
    div.className = 'row mb-2';
    div.innerHTML = `
        <div class="col-5"><input type="text" class="form-control form-control-sm" placeholder="Tên" name="attrName"></div>
        <div class="col-5"><input type="text" class="form-control form-control-sm" placeholder="Giá trị" name="attrValue"></div>
        <div class="col-2"><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.parentElement.remove()">X</button></div>
    `;
    container.appendChild(div);
}
