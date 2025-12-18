import { showDialog } from "../dialog/index.js";
import { ProductService } from "./service.js";
import { ProductLogic } from "./logic.js";
import { ProductUI } from "./ui.js";

const IMAGE_BASE_URL = "http://localhost:8080/images/";

let state = {
    products: [], // Thêm mảng chứa danh sách sản phẩm
    categories: [],
    brands: [],
    attributes: [],
    variants: [],
    selectedAttributes: [],
    mainImageFile: null
};

// === 1. VIEW & RENDER MANAGEMENT
const ViewManager = {
    // Chuyển sang xem danh sách
    showList: () => {
        document.getElementById("view-list").classList.remove("hidden");
        document.getElementById("view-form").classList.add("hidden");
        reloadData(); // Tải lại dữ liệu mới nhất
    },
    // Chuyển sang form thêm mới
    showForm: () => {
        document.getElementById("view-list").classList.add("hidden");
        document.getElementById("view-form").classList.remove("hidden");
        resetForm(); // Xóa trắng form
    },
    // Render bảng dữ liệu
    renderTable: (products) => {
        const tbody = document.querySelector("#productTable tbody");
        const emptyState = document.getElementById("emptyState");
        
        tbody.innerHTML = ""; // Xóa cũ

        if (!products || products.length === 0) {
            emptyState.classList.remove("hidden");
            return;
        }
        emptyState.classList.add("hidden");

        const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

        tbody.innerHTML = products.map(p => {
            // Xử lý ảnh: Nếu có tên ảnh thì ghép URL, không thì dùng ảnh lỗi
            const imgUrl = p.imageName 
                ? `${IMAGE_BASE_URL}${p.imageName}` 
                : "https://via.placeholder.com/50?text=No+Img";

            return `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${imgUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">
                            <span class="product-name">${p.productName}</span>
                        </div>
                    </td>
                    <td>
                        <div class="category-info">
                            <span>${p.categoryName || '-'}</span>
                            <small>${p.brandName || '-'}</small>
                        </div>
                    </td>
                    <td><span class="price">${fmt.format(p.price)}</span></td>
                    <td>
                         <span class="badge">${p.variants ? p.variants.length : 0} loại</span>
                    </td>
                    <td>
                        <div class="actions">
                             <button class="btn-icon delete" onclick="window.handleDelete('${p.productId}')" title="Xóa">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
};

// === 2. LOGIC SAVE (Giữ nguyên logic FormData của bạn) ===
async function handleSave(e) {
    e.preventDefault();

    // --- Validation ---
    const productName = document.getElementById("prodName").value.trim(); // Lưu ý ID input bên HTML mới là prodName
    const price = parseFloat(document.getElementById("prodPrice").value);
    const priceOriginal = parseFloat(document.getElementById("prodOriginalPrice").value);
    const categoryId = document.getElementById("prodCate").value;
    const brandId = document.getElementById("prodBrand").value;

    if (!productName || !categoryId || !brandId || !price) {
        await showDialog("error", "Vui lòng điền đầy đủ thông tin bắt buộc!");
        return;
    }

    // --- Payload JSON ---
    const payload = ProductLogic.formatProductData(
        {
            productName,
            description: document.getElementById("prodDesc").value.trim() || "",
            price,
            priceOriginal: priceOriginal || 0,
            categoryId,
            brandId
        },
        ProductUI.state.selectedAttributes,
        ProductUI.state.variants
    );

    // --- Payload FormData ---
    const formData = new FormData();
    
    // Ảnh chính
    if (state.mainImageFile) {
        const mainImageKey = "productImage"; 
        payload.productDetailDTO.imageName = mainImageKey;
        formData.append(mainImageKey, state.mainImageFile);
    } else {
        await showDialog("error", "Vui lòng chọn ảnh chính cho sản phẩm!");
        return;
    }
    
    // Ảnh biến thể
    ProductUI.state.variants.forEach((v, index) => {
        if (v.imageFile) {
            const variantKey = `image_variant_${index}`;
            payload.variants[index].imageName = variantKey;
            formData.append(variantKey, v.imageFile);
        }
    });

    const jsonBlob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    formData.append("productDTO", jsonBlob);

    // Gửi Request
    try {
        const res = await ProductService.createProduct(formData);
        
        if (res && res.success) {
            await showDialog("success", "Tạo sản phẩm thành công!");
            
            // --- THAY ĐỔI QUAN TRỌNG: Quay về danh sách ---
            ViewManager.showList(); 
            
        } else {
            const errorMsg = res?.data?.[0]?.error || res?.message || "Có lỗi xảy ra";
            await showDialog("error", errorMsg);
        }
    } catch (error) {
        console.error(error);
        await showDialog("error", "Lỗi hệ thống: " + error.message);
    }
}

// === 3. RESET FORM ===
function resetForm() {
    state.variants = [];
    state.mainImageFile = null;
    ProductUI.state.selectedAttributes = [];
    ProductUI.state.variants = [];
    
    document.getElementById("productForm").reset();
    document.getElementById("attributes-container").innerHTML = ""; // Xóa các dòng thuộc tính
    document.getElementById("variants-wrapper").classList.add("hidden"); // Ẩn vùng biến thể
    document.getElementById("variant-list").innerHTML = "";
    
    // Reset ảnh preview về placeholder
    document.getElementById("mainImgPreview").classList.add("hidden");
    document.getElementById("mainImgPlaceholder").classList.remove("hidden");
    document.getElementById("mainImgInput").value = "";
}

// === 4. EVENTS & INIT ===
function setupEventListeners() {
    // Nút mở form thêm mới
    document.getElementById("btnOpenAdd").onclick = () => {
        ViewManager.showForm();
    };

    // Nút Quay lại & Nút Hủy
    const backAction = () => ViewManager.showList();
    document.getElementById("btnBack").onclick = backAction;
    
    const btnCancel = document.getElementById("btnCancel");
    if(btnCancel) btnCancel.onclick = backAction;

    // Submit Form
    document.getElementById("productForm").onsubmit = handleSave;
    
    // Upload Ảnh Chính
    document.getElementById("mainImgInput").onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            state.mainImageFile = file;
            // Hiển thị preview (Logic UI thuần túy)
            const preview = document.getElementById("mainImgPreview");
            const placeholder = document.getElementById("mainImgPlaceholder");
            preview.src = URL.createObjectURL(file);
            preview.classList.remove("hidden");
            placeholder.classList.add("hidden");
        }
    };

    // Logic Category/Brand (Giữ nguyên)
    document.getElementById("prodCate").onchange = (e) => {
        const catId = e.target.value;
        const brandSel = document.getElementById("prodBrand");
        brandSel.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
        
        const filtered = state.brands.filter(b => b.categoryId == catId);
        (filtered.length ? filtered : state.brands).forEach(b => {
             brandSel.innerHTML += `<option value="${b.brandId}">${b.brandName}</option>`;
        });
    };
    
    // Global function cho nút Xóa trên bảng
    window.handleDelete = async (id) => {
        await showDialog("question", "Xóa sản phẩm này?", async () => {
            // Giả lập xóa (hoặc gọi API thật nếu có)
            const res = await ProductService.deleteProduct(id); // Cần đảm bảo service có hàm này
            if(res.success) {
                await showDialog("success", "Đã xóa!");
                reloadData();
            } else {
                await showDialog("error", "Lỗi khi xóa");
            }
        });
    };
}

async function reloadData() {
    try {
        // Load lại danh sách sản phẩm
        const products = await ProductService.getAll({});
        state.products = products || [];
        ViewManager.renderTable(state.products);
    } catch (e) {
        console.error(e);
    }
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
        
        // Gán vào UI State để dùng cho logic generate biến thể
        ProductUI.state.categories = state.categories;
        ProductUI.state.brands = state.brands;
        ProductUI.state.attributes = state.attributes;

        // Render Select Danh mục
        const catSelect = document.getElementById("prodCate");
        catSelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
        state.categories.forEach(c => {
            catSelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
        });

        // Load dữ liệu bảng lần đầu
        await reloadData();

    } catch (error) {
        console.error("Lỗi init:", error);
        await showDialog("error", "Không thể tải dữ liệu.");
    }
}

(async function init() {
    await loadInitialData();
    setupEventListeners();
})();