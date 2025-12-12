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
    mainImageFile: null
};

// --- HANDLER SAVE (CHỈ THÊM MỚI) ---
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
            description: document.getElementById("prodDesc").value.trim() || "",
            price: price,
            priceOriginal: parseFloat(document.getElementById("prodOriginalPrice").value) || price,
            categoryId: categoryId,
            brandId: brandId,
            imageName: null,
            imageUrl: null
        },
        attributes: [],
        variants: [],
        variantValues: []
    };

    // 3. Xử lý ảnh chính
    if (state.mainImageFile) {
        const fName = state.mainImageFile.name;
        // Lấy tên file không có extension
        const nameWithoutExt = fName.substring(0, fName.lastIndexOf('.')) || fName;
        payload.productDetailDTO.imageName = nameWithoutExt;
        formData.append("images", state.mainImageFile);
    }

    // 4. Xử lý Attributes
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

    // 5. Xử lý Variants và variantValues
    state.variants.forEach((v, idx) => {
        const tempVariantId = `variant_${idx}`;
        
        let finalImageName = null;
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

    // 6. ĐÂY LÀ CÁCH ĐÚNG: Append JSON như một field trong FormData
    // Có 3 cách phổ biến, thử từng cách:
    
    // CÁCH 1: Gửi JSON string trực tiếp (phổ biến nhất)
    formData.append("productDTO", JSON.stringify(payload));
    
    // NẾU CÁCH 1 KHÔNG WORK, thử CÁCH 2: Gửi như Blob
    // const jsonBlob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    // formData.append("productDTO", jsonBlob);
    
    // NẾU CÁCH 2 KHÔNG WORK, thử CÁCH 3: Gửi như File
    // const jsonFile = new File([JSON.stringify(payload)], "productDTO.json", { type: "application/json" });
    // formData.append("productDTO", jsonFile);

    // Debug log
    console.log("Payload JSON:", payload);
    console.log("FormData entries:");
    for (let [key, value] of formData.entries()) {
        console.log(key, value);
    }

    // 7. Gửi Request
    try {
        const res = await ProductService.create(formData);
        if (res && res.success) {
            await showDialog("success", "Tạo sản phẩm thành công!");
            UI.switchView('list');
            reloadData();
            resetForm();
        } else {
            await showDialog("error", res?.message || "Có lỗi xảy ra khi lưu.");
            console.error("Server response:", res);
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

function openForm() {
    resetForm();
    UI.switchView('form');
    UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes);
}

function resetForm() {
    state.variants = [];
    state.mainImageFile = null;
    state.currentAttributes = [];
    
    document.getElementById("productForm").reset();
    UI.els.attrContainer.innerHTML = "";
    UI.els.variantWrapper.classList.add("hidden");
    UI.els.brandSelect.innerHTML = `<option value="">-- Chọn danh mục trước --</option>`;
    UI.els.formTitle.innerText = "Thêm sản phẩm mới";
    UI.renderMainImage(null);
    UI.els.mainImgInput.value = "";
}

// --- MAIN FUNCTIONS ---
function setupEventListeners() {
    document.getElementById("btnOpenAdd").onclick = openForm;
    document.getElementById("btnBack").onclick = () => { UI.switchView('list'); reloadData(); };
    document.getElementById("btnAddAttr").onclick = () => { 
        UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes); 
    };
    
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
    }
}

// --- INIT ---
(async function init() {
    await reloadData();
    setupEventListeners();
})();