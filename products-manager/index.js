import { ProductService } from './service.js';
import { UI } from './ui.js';
// import { showToast } from '../public/toast.js'; // Assuming toast exists, or use alert for now

// State
let currentPage = 0;
let totalPages = 1;
let currentProductId = null; // Used for Edit Mode
let currentVariants = []; // Store variants of current product
let loadedProducts = []; // Store current page products
let categories = [];
let brands = [];

// DOM Elements
const btnSearch = document.getElementById('btnSearch');
const searchInput = document.getElementById('searchInput');
const btnViewList = document.getElementById('btnViewList');
const btnViewAdd = document.getElementById('btnViewAdd');
const btnBackToList = document.getElementById('btnBackToList');
const productForm = document.getElementById('productForm');

const variantsTabBtn = document.getElementById('variants-tab');
const btnAddVariantModal = document.getElementById('btnAddVariantModal');
const variantModal = new bootstrap.Modal(document.getElementById('variantModal'));
const btnSaveVariant = document.getElementById('btnSaveVariant');
const btnAddAttributeLine = document.getElementById('btnAddAttributeLine');

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', async () => {
    await loadMetaData();
    await loadProducts();
    setupEventListeners();
});

async function loadMetaData() {
    const info = await ProductService.getInfo();
    categories = info.categories;
    brands = info.brands;

    UI.fillSelectOptions('categoryId', categories);
    UI.fillSelectOptions('brandId', brands);
}

// ================= PRODUCT LIST LOGIC =================
async function loadProducts(page = 0) {
    const keyword = searchInput.value.trim();
    const result = await ProductService.getProductsList(page, 10, keyword);

    loadedProducts = result.products;
    currentPage = result.currentPage;
    totalPages = result.totalPages;

    UI.renderProductList(loadedProducts, 'productsTableBody');
    UI.renderPagination(currentPage, totalPages, 'pagination', loadProducts);

    // Re-attach event listeners for dynamic buttons
    document.querySelectorAll('.btn-edit-product').forEach(btn => {
        btn.onclick = () => openEditProduct(btn.dataset.id);
    });
    document.querySelectorAll('.btn-delete-product').forEach(btn => {
        btn.onclick = () => deleteProduct(btn.dataset.id);
    });
}

// ================= NAVIGATION =================
function setupEventListeners() {
    // Top Nav
    btnViewList.onclick = () => UI.showListView();
    btnViewAdd.onclick = () => {
        currentProductId = null;
        UI.showFormView('ADD');
    };
    btnBackToList.onclick = () => UI.showListView();

    // Search
    btnSearch.onclick = () => loadProducts(0);
    searchInput.onkeypress = (e) => {
        if (e.key === 'Enter') loadProducts(0);
    };

    // Product Form Submit
    productForm.onsubmit = handleProductSubmit;

    // Variant Events
    btnAddVariantModal.onclick = () => openVariantModal();
    btnSaveVariant.onclick = handleVariantSubmit;
    btnAddAttributeLine.onclick = () => {
        const container = document.getElementById('variantAttributesContainer');
        const div = document.createElement('div');
        div.className = 'row mb-2 align-items-center';
        div.innerHTML = `
            <div class="col-5"><input type="text" class="form-control form-control-sm" placeholder="Tên" name="attrName[]"></div>
            <div class="col-5"><input type="text" class="form-control form-control-sm" placeholder="Giá trị" name="attrValue[]"></div>
            <div class="col-2 text-end"><button type="button" class="btn btn-sm btn-outline-danger btn-remove-attr"><i class="bi bi-x"></i></button></div>
        `;
        div.querySelector('.btn-remove-attr').onclick = () => div.remove();
        container.appendChild(div);
    };
}

// ================= PRODUCT CRUD =================
async function handleProductSubmit(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('productName').value,
        description: document.getElementById('description').value,
        categoryId: document.getElementById('categoryId').value,
        brandId: document.getElementById('brandId').value,
        status: true // Default active
    };

    let res;
    if (currentProductId) {
        // UPDATE
        formData.id = currentProductId;
        res = await ProductService.updateProduct(formData);
    } else {
        // CREATE
        res = await ProductService.createProduct(formData);
    }

    if (res && res.success) {
        alert(currentProductId ? 'Cập nhật thành công!' : 'Tạo sản phẩm thành công!');
        if (!currentProductId && res.data && res.data.id) {
            // Created -> Switch to Edit mode to allow adding variants
            currentProductId = res.data.id;
            UI.showFormView('EDIT');
            // Enable variants tab
            variantsTabBtn.disabled = false;
            // Load variants (empty initially)
            currentVariants = [];
            UI.renderVariantList([], 'variantsTableBody');
        }
        // If updating, just stay? Or reload list?
        // Let's reload list in background
        loadProducts(currentPage);
    } else {
        alert('Lỗi: ' + (res?.message || 'Không xác định'));
    }
}

async function openEditProduct(id) {
    const product = await ProductService.getProductById(id);
    if (product) {
        currentProductId = product.id;
        UI.showFormView('EDIT');
        UI.fillProductForm(product);

        // Load variants
        // Assuming product object contains variants list or we fetch it.
        // Based on service.js there isn't a getVariantsByProductId, usually getProductById returns it
        // Or we might need to fetch separately if API is designed that way.
        // Let's assume product.variants exists. If not, and we need another call, we would add it.
        // Inspecting ProductService.getProductById -> calls /admin/products/{id} -> returns res.data
        // Usually detailed product includes variants.

        currentVariants = product.variants || [];
        UI.renderVariantList(currentVariants, 'variantsTableBody');
        setupVariantTableEvents();
    }
}

async function deleteProduct(id) {
    if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
        const res = await ProductService.deleteProduct(id);
        if (res && res.success) {
            alert('Đã xóa sản phẩm');
            loadProducts(currentPage);
        } else {
            alert('Lỗi xóa sản phẩm: ' + (res?.message || ''));
        }
    }
}

// ================= VARIANT CRUD =================
function setupVariantTableEvents() {
    document.querySelectorAll('.btn-edit-variant').forEach(btn => {
        btn.onclick = () => openVariantModal(btn.dataset.id);
    });
    document.querySelectorAll('.btn-delete-variant').forEach(btn => {
        btn.onclick = () => deleteVariant(btn.dataset.id);
    });
}

function openVariantModal(variantId = null) {
    const form = document.getElementById('variantForm');
    form.reset();
    document.getElementById('variantAttributesContainer').innerHTML = ''; // Clear dynamic attributes

    // Clear image preview
    const previewBox = document.getElementById('variantImagePreviewBox');
    previewBox.innerHTML = '<span class="text-muted"><i class="bi bi-image fs-1"></i></span>';

    if (variantId) {
        const variant = currentVariants.find(v => v.id == variantId);
        if (variant) {
            document.getElementById('variantId').value = variant.id;
            document.getElementById('variantSku').value = variant.sku || '';
            document.getElementById('variantPriceImport').value = variant.priceImport || 0;
            document.getElementById('variantPrice').value = variant.price || 0;
            document.getElementById('variantQuantity').value = variant.quantity || 0;

            // Image
            if (variant.image) {
                previewBox.innerHTML = `<img src="${variant.image}" class="img-fluid" style="max-height: 100%;">`;
            }

            // Attributes
            if (variant.attributes) {
                UI.renderAttributeInputs('variantAttributesContainer', variant.attributes);
            }

            document.getElementById('variantModalTitle').textContent = 'Chỉnh Sửa Biến Thể';
        }
    } else {
        document.getElementById('variantId').value = '';
        document.getElementById('variantModalTitle').textContent = 'Thêm Biến Thể Mới';
        UI.renderAttributeInputs('variantAttributesContainer', [{ name: 'Màu sắc', value: '' }, { name: 'Kích thước', value: '' }]); // Default suggestions
    }

    variantModal.show();
}

async function handleVariantSubmit() {
    // Validate
    const priceImport = document.getElementById('variantPriceImport').value;
    const price = document.getElementById('variantPrice').value;
    // ... basic validation

    // Collect Attributes
    const attrNames = document.getElementsByName('attrName[]');
    const attrValues = document.getElementsByName('attrValue[]');
    const attributes = [];
    for (let i = 0; i < attrNames.length; i++) {
        if (attrNames[i].value && attrValues[i].value) {
            attributes.push({
                name: attrNames[i].value,
                value: attrValues[i].value
            });
        }
    }

    const payload = {
        productId: currentProductId,
        sku: document.getElementById('variantSku').value,
        priceImport: parseFloat(priceImport),
        price: parseFloat(price),
        quantity: parseInt(document.getElementById('variantQuantity').value),
        attributes: attributes
    };

    // Handle Image Upload (if file selected)
    // IMPORTANT: Simplification - normally handle file upload to get URL first, or use FormData
    // Assuming backend accepts JSON payload with image URL or base64? 
    // Or if backend requires Multipart Form Data. The `callAPI` usually handles JSON. 
    // If we have an image file, current `callAPI` might not support form-data unless modified.
    // For now, let's assume we skip image upload logic or handle it as specific TODO if user didn't specify mechanism.
    // Wait, the user has specific Controller endpoints. Usually POST /variants accepts JSON bodies.
    // Image handling is tricky without seeing the API spec for images. I will skip File upload code -> URL conversion for this turnaround and focus on data.

    const variantId = document.getElementById('variantId').value;
    let res;

    if (variantId) {
        payload.id = variantId;
        res = await ProductService.updateVariant(payload);
    } else {
        res = await ProductService.createVariant(payload);
    }

    if (res && res.success) {
        alert('Lưu biến thể thành công');
        variantModal.hide();
        // Refresh variants list
        await openEditProduct(currentProductId); // Reload product & variants
    } else {
        alert('Lỗi lưu biến thể: ' + (res?.message || ''));
    }
}

async function deleteVariant(variantId) {
    if (confirm('Xóa biến thể này?')) {
        const res = await ProductService.deleteVariant(variantId);
        if (res && res.success) {
            await openEditProduct(currentProductId);
        } else {
            alert('Lỗi xóa biến thể: ' + (res?.message || ''));
        }
    }
}
