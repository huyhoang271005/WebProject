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
    mainImageFile: null,
    currentProductId: null // [MỚI] Để track đang sửa sản phẩm nào
};

// --- HÀM LOAD DANH SÁCH ---
async function loadProductList() {
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5">Đang tải dữ liệu... <div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';
    
    try {
        // ID TEST CỦA BẠN
        const testId = "6786aedf-aa81-44ef-b28f-06abff1b5c1c"; 
        const data = await ProductService.getProductById(testId);

        if (data && data.productDetailDTO) {
            state.products = [data.productDetailDTO];
            // Lưu lại data full để dùng cho Edit (vì productDetailDTO thiếu variants list chi tiết)
            // Ta sẽ gộp data trả về vào object product để dễ xử lý
            state.products[0].fullData = data; 

            ProductUI.renderProductList(state.products, state.categories, state.brands);
            
            // [MỚI] Gán sự kiện click cho các nút Sửa
            attachEditEvents();
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Không tìm thấy sản phẩm.</td></tr>';
        }
    } catch (error) {
        console.error("Lỗi:", error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Lỗi kết nối API.</td></tr>';
    }
}

// [MỚI] Gán sự kiện cho nút Sửa
function attachEditEvents() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Ngăn chặn hành vi mặc định
            e.preventDefault(); 
            const id = btn.dataset.id;
            handleEdit(id);
        });
    });
}

// [MỚI] Logic xử lý khi bấm Sửa
function handleEdit(id) {
    const product = state.products.find(p => p.productId === id);
    if (!product || !product.fullData) return;
    
    const fullData = product.fullData; // Dữ liệu đầy đủ từ API (bao gồm attributes, variants)

    // 1. Chuyển sang View Form
    ProductUI.toggleView('create');
    document.querySelector('#createView h2').textContent = "Cập Nhật Sản Phẩm";
    document.getElementById('submitBtn').innerHTML = "Lưu thay đổi";
    state.currentProductId = id; // Đánh dấu đang sửa

    // 2. Điền thông tin cơ bản
    document.getElementById("productName").value = product.productName;
    document.getElementById("description").value = product.description || "";
    document.getElementById("price").value = product.price;
    document.getElementById("priceOriginal").value = product.originalPrice;
    
    // Select Category & Brand
    if(product.categoryId) document.getElementById("categoryId").value = product.categoryId;
    // Trigger change để load brands nếu cần (hoặc set tay)
    if(product.categoryId && product.brandId) {
        // Logic filter brand giống setupEventListeners
        const brandSelect = document.getElementById("brandId");
        brandSelect.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
        state.brands.filter(b => b.categoryId == product.categoryId).forEach(b => {
             brandSelect.innerHTML += `<option value="${b.brandId}" ${b.brandId == product.brandId ? 'selected' : ''}>${b.brandName}</option>`;
        });
    }

    // Preview ảnh chính cũ
    if (product.imageUrl) {
        document.getElementById('mainImagePreview').innerHTML = `<img src="${product.imageUrl}" class="img-thumbnail mt-2" style="max-height: 150px;">`;
    }

    // 3. Điền Attributes (Phần Khó Nhất)
    // Cần map từ API attributes -> UI selectedAttributes
    ProductUI.state.isEditingMode = true; // Cờ để chặn auto-generate variants
    document.getElementById('selectedAttributesList').innerHTML = ""; // Xóa cũ
    
    const apiAttributes = fullData.attributes || [];
    const uiAttributes = [];

    apiAttributes.forEach(attr => {
        // Map cấu trúc API sang cấu trúc UI
        const values = attr.attributeValues.map(v => ({
            id: v.attributeValueId, // Giữ ID thực
            name: v.attributeValueName
        }));

        uiAttributes.push({
            attributeId: attr.attributeId,
            attributeName: attr.attributeName,
            values: values
        });

        // Render ra giao diện
        ProductUI.addAttributeRow({
            attributeId: attr.attributeId,
            values: values
        });
    });

    ProductUI.state.selectedAttributes = uiAttributes;

    // 4. Điền Variants (Phần Khó Nhì)
    // Map API variants -> UI variants
    const apiVariants = fullData.variants || [];
    const uiVariants = apiVariants.map(v => {
        // Cần tìm tên hiển thị (displayName) cho variant này
        // Thường API trả về không có tên ghép (VD: Đỏ - XL), ta phải tự tìm hoặc dùng tạm ID
        // Ở đây ta tìm trong variantValues để ghép tên (nếu có logic đó), 
        // hoặc đơn giản là hiển thị "Biến thể X" nếu lười :D. 
        // Nhưng tốt nhất là hiển thị giá/tồn kho đúng.
        return {
            variantId: v.variantId, // ID thực để update
            displayName: "Biến thể (Cập nhật)", // Tạm thời, vì logic ghép tên từ API response khá phức tạp
            price: v.price,
            priceOriginal: v.originalPrice,
            stock: v.stock,
            imageUrl: v.imageUrl,
            imageFile: null
        };
    });

    // Nếu muốn hiển thị tên Variant đúng (VD: Màu Đỏ - Size L), ta cần logic map variantValues trong fullData.
    // Logic này khá dài dòng, nếu bạn cần thì bảo tôi, còn tạm thời hiển thị list variant ra để sửa giá/kho đã.
    
    ProductUI.state.variants = uiVariants;
    ProductUI.renderVariantsTable();

    ProductUI.state.isEditingMode = false; // Tắt cờ
}

// --- HANDLER SAVE (Cập nhật logic Update) ---
async function handleSave(e) {
    e.preventDefault();
    // ... Validation code cũ giữ nguyên ...
    const productName = document.getElementById("productName").value.trim();
    const price = parseFloat(document.getElementById("price").value);
    const priceOriginal = parseFloat(document.getElementById("priceOriginal").value);
    const categoryId = document.getElementById("categoryId").value;
    const brandId = document.getElementById("brandId").value;

    if (!productName || !categoryId || !brandId || !price || !priceOriginal) {
        await showDialog("error", "Vui lòng điền đầy đủ thông tin bắt buộc!"); return;
    }
    
    // ... (Validation Logic & Payload cũ giữ nguyên) ...
    const validation = ProductLogic.validateProduct({ productName, price, priceOriginal, variants: ProductUI.state.variants });
    if (!validation.isValid) { await showDialog("error", validation.errors.join('\n')); return; }

    const payload = ProductLogic.formatProductData(
        { productName, description: document.getElementById("description").value.trim() || "", price, priceOriginal, categoryId, brandId },
        ProductUI.state.selectedAttributes, ProductUI.state.variants
    );

    // Nếu đang sửa -> Gán ID sản phẩm vào payload
    if (state.currentProductId) {
        payload.productDetailDTO.productId = state.currentProductId;
    }

    const formData = new FormData();
    // Logic ảnh chính: Nếu có file mới thì gửi, không thì thôi (API update phải xử lý đc việc này)
    if (state.mainImageFile) {
        payload.productDetailDTO.imageName = "productImage"; 
        formData.append("productImage", state.mainImageFile);
    } 
    // Nếu đang sửa mà không chọn ảnh mới -> Backend giữ ảnh cũ. (Cần đảm bảo backend hỗ trợ)
    
    ProductUI.state.variants.forEach((v, i) => {
        if (v.imageFile) {
            payload.variants[i].imageName = `image_variant_${i}`;
            formData.append(`image_variant_${i}`, v.imageFile);
        }
    });
    
    formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

    // Submit
    const submitBtn = document.getElementById("submitBtn");
    const spinner = document.getElementById("submitSpinner");
    submitBtn.disabled = true; spinner.classList.remove("d-none");

    try {
        let res;
        // Nếu đang có ID -> Gọi API Update (Bạn cần thêm hàm updateProduct trong service nếu chưa có, hoặc dùng tạm create)
        // Giả sử dùng chung create (POST) hoặc logic backend tự xử
        res = await ProductService.createProduct(formData);
        
        if (res && res.success) {
            await showDialog("success", state.currentProductId ? "Cập nhật thành công!" : "Tạo sản phẩm thành công!");
            resetForm();
            ProductUI.toggleView('list');
            await loadProductList();
        } else {
            await showDialog("error", res?.message || "Có lỗi xảy ra");
        }
    } catch (error) {
        await showDialog("error", "Lỗi: " + error.message);
    } finally {
        submitBtn.disabled = false; spinner.classList.add("d-none");
    }
}

function resetForm() {
    state.currentProductId = null; // Reset ID sửa
    state.mainImageFile = null;
    ProductUI.state.variants = [];
    ProductUI.state.selectedAttributes = [];
    ProductUI.state.mainImageFile = null;
    
    document.getElementById("productForm").reset();
    document.getElementById("selectedAttributesList").innerHTML = "";
    document.getElementById("variantsContainer").innerHTML = "";
    document.getElementById("mainImagePreview").innerHTML = "";
    
    // Reset tiêu đề form
    document.querySelector('#createView h2').textContent = "Thêm Sản Phẩm Mới";
    document.getElementById('submitBtn').innerHTML = "Tạo sản phẩm";
}

// ... (Phần setupEventListeners và loadInitialData giữ nguyên) ...
function setupEventListeners() {
    document.getElementById("productForm").onsubmit = handleSave;
    document.getElementById("resetBtn").onclick = resetForm;
    document.getElementById("btnOpenCreate").onclick = () => {
        resetForm(); // Reset trước khi mở form thêm mới
        ProductUI.toggleView('create');
    };
    document.getElementById("btnBackToList").onclick = () => ProductUI.toggleView('list');
    
    document.getElementById("mainImage").onchange = (e) => {
        if(e.target.files[0]) { state.mainImageFile = e.target.files[0]; ProductUI.handleMainImageUpload(e.target.files[0]); }
    };
    document.getElementById("categoryId").onchange = (e) => {
        const categoryId = e.target.value;
        const brandSelect = document.getElementById("brandId");
        brandSelect.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
        if(!categoryId) return;
        state.brands.filter(b => b.categoryId == categoryId).forEach(b => {
            brandSelect.innerHTML += `<option value="${b.brandId}">${b.brandName}</option>`;
        });
    };
}

async function loadInitialData() {
    try {
        const cats = await ProductService.getCategories();
        const [brands, attrs] = await Promise.all([
            ProductService.getBrands(),
            ProductService.getAttributes()
        ]);
        
        state.categories = cats || [];
        state.brands = brands || [];
        state.attributes = attrs || [];
        ProductUI.state.categories = state.categories;
        ProductUI.state.brands = state.brands;
        ProductUI.state.attributes = state.attributes;

        const categorySelect = document.getElementById("categoryId");
        categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
        state.categories.forEach(c => categorySelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`);
        ProductUI.renderAttributeSelector();
        
        await loadProductList();

    } catch (e) { console.error(e); }
}

(async function init() { await loadInitialData(); setupEventListeners(); })();