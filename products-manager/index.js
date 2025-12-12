import { showDialog } from "../dialog/index.js";
import { ProductService } from "./service.js";
import { VariantLogic } from "./logic.js";
import { UI } from "./ui.js";

let state = {
    products: [],
    categories: [],
    brands: [],
    attributes: [],
    variants: [],
    currentAttributes: [],
    isEdit: false,
    currentId: null,
    mainImageFile: null,
    currentMainImageName: ""
};

// --- HANDLERS (Khai báo trước để tránh lỗi not defined) ---

async function handleDelete(id) {
    await showDialog("question", "Bạn có chắc muốn xóa sản phẩm này?", async () => {
        try {
            // Gọi API xóa từ Service (bạn cần đảm bảo Service có hàm delete)
            const res = await ProductService.delete(id); 
            if (res && res.success) {
                await showDialog("success", "Đã xóa thành công");
                reloadData(); // Tải lại danh sách
            } else {
                await showDialog("error", res?.message || "Không thể xóa sản phẩm");
            }
        } catch (e) {
            console.error(e);
            await showDialog("error", "Lỗi khi xóa: " + e.message);
        }
    });
}

async function handleSave(e) {
    e.preventDefault();

    // Validation cơ bản
    const productName = document.getElementById("prodName").value.trim();
    const price = parseFloat(document.getElementById("prodPrice").value);
    const categoryId = document.getElementById("prodCate").value;
    const brandId = document.getElementById("prodBrand").value;

    if (!productName || !categoryId || !brandId || !price) {
        await showDialog("error", "Vui lòng điền đầy đủ thông tin bắt buộc!");
        return;
    }

    // 1. Chuẩn bị FormData
    const formData = new FormData();
    
    // 2. Chuẩn bị JSON Payload
    const payload = {
        productDetailDTO: {
            productName: productName,
            description: document.getElementById("prodDesc").value.trim(),
            price: price,
            priceOriginal: parseFloat(document.getElementById("prodOriginalPrice").value) || price,
            categoryId: categoryId,
            brandId: brandId,
            imageName: state.currentMainImageName || null
        },
        attributes: [],
        variants: [],
        variantValues: []
    };

    // Xử lý ảnh chính
    if (state.mainImageFile) {
        const fName = state.mainImageFile.name;
        payload.productDetailDTO.imageName = fName.substring(0, fName.lastIndexOf('.')) || fName;
        formData.append("images", state.mainImageFile);
    }

    // 3. Xử lý Attributes
    state.currentAttributes.forEach((attr) => {
        const attributeValues = attr.values.map((valName) => {
            const existingId = attr.valueIdMap?.[valName];
            return { 
                attributeValueId: existingId || null, 
                attributeValueName: valName 
            };
        });

        payload.attributes.push({
            attributeId: attr.id || null,
            attributeName: attr.name,
            attributeValues: attributeValues
        });
    });

    // 4. Xử lý Variants và variantValues
    const variantIdCounter = {}; // Map tạm để track variant IDs
    
    state.variants.forEach((v, idx) => {
        const tempVariantId = state.isEdit && v.id && !v.id.toString().startsWith("new_") 
            ? v.id 
            : `temp_variant_${idx}`;
        
        variantIdCounter[idx] = tempVariantId;
        
        let finalImageName = v.imageName || null;
        if (v.rawFile) {
            const fName = v.rawFile.name;
            finalImageName = fName.substring(0, fName.lastIndexOf('.')) || fName;
            formData.append("images", v.rawFile);
        }

        payload.variants.push({
            variantId: tempVariantId,
            imageName: finalImageName,
            price: parseFloat(v.price) || price,
            priceOriginal: parseFloat(v.priceOriginal) || parseFloat(v.price) || price,
            stock: parseInt(v.stock) || 0,
            sold: 0,
            imageUrl: null,
            active: true
        });

        // Map variantValues
        if (v.comboValues && v.comboValues.length > 0) {
            v.comboValues.forEach((valName) => {
                const parentAttr = state.currentAttributes.find(a => a.values.includes(valName));
                if (parentAttr) {
                    const valId = parentAttr.valueIdMap?.[valName];
                    payload.variantValues.push({ 
                        variantId: tempVariantId,
                        attributeValueId: valId || null 
                    });
                }
            });
        }
    });

    // 5. Đóng gói JSON
    const jsonBlob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    formData.append("productDTO", jsonBlob, "productDTO.json");

    // Debug log
    console.log("Payload:", payload);

    // 6. Gửi Request
    try {
        const res = await ProductService.save(formData, state.isEdit ? state.currentId : null);
        if (res && res.success) {
            await showDialog("success", state.isEdit ? "Cập nhật thành công!" : "Tạo sản phẩm thành công!");
            UI.switchView('list');
            reloadData();
        } else {
            await showDialog("error", res?.message || "Có lỗi xảy ra khi lưu.");
        }
    } catch (error) {
        console.error("Save error:", error);
        await showDialog("error", "Lỗi kết nối: " + error.message);
    }
}

function handleCalcVariants() {
    const attrs = VariantLogic.parseAttributesFromDOM();
    state.currentAttributes = attrs;
    const basePrice = parseFloat(document.getElementById("prodPrice").value) || 0;
    state.variants = VariantLogic.generateVariants(attrs, basePrice, state.variants);
    UI.renderVariants(state.variants);
}

function handleSelectVariantImage(index, input) {
    const file = input.files[0];
    if (file) {
        state.variants[index].rawFile = file;
        state.variants[index].previewUrl = URL.createObjectURL(file);
        state.variants[index].imageName = file.name;
        UI.renderVariants(state.variants);
    }
}

async function loadAndOpenForm(id) {
    const product = state.products.find(p => p.productId === id);
    if (product) openForm(product);
    else showDialog("error", "Không tìm thấy dữ liệu sản phẩm");
}

function openForm(product = null) {
    state.isEdit = !!product;
    state.currentId = product?.productId || null;
    state.variants = [];
    state.mainImageFile = null;
    state.currentMainImageName = "";
    state.currentAttributes = [];

    UI.resetForm(state.isEdit);

    if (product) {
        UI.fillForm(product);
        UI.renderBrands(state.brands, product.categoryId, product.brandId);
        state.currentMainImageName = product.imageName || "";

        if (product.attributes?.length) {
            product.attributes.forEach(attr => {
                const valStr = attr.attributeValues.map(v => v.attributeValueName).join(", ");
                const valueIdMap = {};
                const valueIds = [];
                attr.attributeValues.forEach(v => {
                    valueIdMap[v.attributeValueName] = v.attributeValueId;
                    valueIds.push(v.attributeValueId);
                });
                UI.addAttrRow(attr.attributeName, valStr, handleCalcVariants, attr.attributeId, valueIds, valueIdMap, state.attributes);
            });
        }

        state.variants = (product.variants || []).map(v => ({
            id: v.variantId,
            name: "Đang tải...",
            price: v.price,
            priceOriginal: v.priceOriginal || v.price,
            stock: v.stock,
            imageName: v.imageName,
            previewUrl: v.imageName || null
        }));
        handleCalcVariants();
    } else {
        UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes);
    }
    UI.switchView('form');
}

// --- MAIN FUNCTIONS ---

function setupEventListeners() {
    document.getElementById("btnOpenAdd").onclick = () => openForm();
    document.getElementById("btnBack").onclick = () => { UI.switchView('list'); reloadData(); };
    document.getElementById("btnAddAttr").onclick = () => { UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes); };
    
    UI.els.cateSelect.onchange = (e) => UI.renderBrands(state.brands, e.target.value);
    document.getElementById("productForm").onsubmit = handleSave;
    
    document.getElementById("mainImgInput").onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            state.mainImageFile = file;
            UI.renderMainImage(URL.createObjectURL(file));
        }
    };

    // Global binding
    window.editProduct = loadAndOpenForm;
    window.deleteProduct = handleDelete; // Đã an toàn vì handleDelete được khai báo bên trên
    window.updateVar = (i, f, v) => { if (state.variants[i]) state.variants[i][f] = v; };
    window.updateVarOriginalPrice = (i, v) => { if (state.variants[i]) state.variants[i].priceOriginal = v; };
    window.removeVariant = (i) => { state.variants.splice(i, 1); UI.renderVariants(state.variants); };
    window.handleSelectVariantImage = handleSelectVariantImage;
}

async function reloadData() {
    try {
        const [prods, cats, brands, attrs] = await Promise.all([
            ProductService.getAll(),
            ProductService.getCategories(),
            ProductService.getBrands(),
            ProductService.getAttributes()
        ]);

        state.products = prods || [];
        state.categories = cats || [];
        state.brands = brands || [];
        state.attributes = attrs || [];

        UI.renderTable(state.products);
        
        UI.els.cateSelect.innerHTML = `<option value="">-- Chọn danh mục --</option>`;
        state.categories.forEach(c => {
            UI.els.cateSelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
        });
    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        // showDialog("error", "Không thể tải dữ liệu."); // Tạm comment để tránh popup khi lỗi 500 server
    }
}

// --- INIT ---
(async function init() {
    await reloadData();
    setupEventListeners();
})();