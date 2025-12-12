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

// --- INIT ---
(async function init() {
    await reloadData();
    setupEventListeners();
})();

// --- DATA LOADING ---
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
        
        // Render Categories vào Select
        UI.els.cateSelect.innerHTML = `<option value="">-- Chọn danh mục --</option>`;
        state.categories.forEach(c => {
            UI.els.cateSelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
        });
    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        showDialog("error", "Không thể tải dữ liệu ban đầu.");
    }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    document.getElementById("btnOpenAdd").onclick = () => openForm();
    
    document.getElementById("btnBack").onclick = () => {
        UI.switchView('list');
        reloadData();
    };

    document.getElementById("btnAddAttr").onclick = () => {
        UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes);
    };

    UI.els.cateSelect.onchange = (e) => {
        UI.renderBrands(state.brands, e.target.value);
    };

    document.getElementById("productForm").onsubmit = handleSave;

    // Xử lý chọn ảnh chính
    document.getElementById("mainImgInput").onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            state.mainImageFile = file;
            UI.renderMainImage(URL.createObjectURL(file));
        }
    };

    // Global Functions cho UI gọi
    window.editProduct = loadAndOpenForm;
    window.deleteProduct = handleDelete;
    
    window.updateVar = (i, f, v) => {
        if (state.variants[i]) state.variants[i][f] = v;
    };
    
    window.updateVarOriginalPrice = (i, v) => {
        if (state.variants[i]) state.variants[i].priceOriginal = v;
    };
    
    window.removeVariant = (i) => {
        state.variants.splice(i, 1);
        UI.renderVariants(state.variants);
    };
    
    window.handleSelectVariantImage = handleSelectVariantImage;
}

// --- LOGIC: OPEN FORM ---
async function loadAndOpenForm(id) {
    const product = state.products.find(p => p.productId === id);
    if (product) {
        openForm(product);
    } else {
        showDialog("error", "Không tìm thấy dữ liệu sản phẩm");
    }
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
        // --- EDIT MODE ---
        UI.fillForm(product);
        UI.renderBrands(state.brands, product.categoryId, product.brandId);
        state.currentMainImageName = product.imageName || "";

        // 1. Map lại Attributes lên UI
        if (product.attributes?.length) {
            product.attributes.forEach(attr => {
                const valStr = attr.attributeValues.map(v => v.attributeValueName).join(", ");
                const valueIdMap = {};
                const valueIds = [];
                
                attr.attributeValues.forEach(v => {
                    valueIdMap[v.attributeValueName] = v.attributeValueId;
                    valueIds.push(v.attributeValueId);
                });

                UI.addAttrRow(
                    attr.attributeName,
                    valStr,
                    handleCalcVariants,
                    attr.attributeId,
                    valueIds,
                    valueIdMap,
                    state.attributes
                );
            });
        }

        // 2. Map lại Variants vào State
        state.variants = (product.variants || []).map(v => ({
            id: v.variantId,
            name: "Đang tải...", // Tên sẽ được tính lại khi attributes load xong
            price: v.price,
            priceOriginal: v.priceOriginal || v.price,
            stock: v.stock,
            imageName: v.imageName,
            previewUrl: v.imageName ? v.imageName : null // Giả sử backend trả về url ảnh
        }));
        
        // Tính toán lại tên variant và hiển thị
        handleCalcVariants();
        
    } else {
        // --- ADD MODE ---
        // Mặc định thêm 1 dòng thuộc tính trống
        UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes);
    }
    
    UI.switchView('form');
}

// --- LOGIC: VARIANTS ---
function handleCalcVariants() {
    const attrs = VariantLogic.parseAttributesFromDOM();
    state.currentAttributes = attrs;
    const basePrice = parseFloat(document.getElementById("prodPrice").value) || 0;
    
    // Gọi logic sinh biến thể (giữ lại thông tin cũ nếu trùng khớp)
    state.variants = VariantLogic.generateVariants(attrs, basePrice, state.variants);
    UI.renderVariants(state.variants);
}

function handleSelectVariantImage(index, input) {
    const file = input.files[0];
    if (file) {
        state.variants[index].rawFile = file;
        state.variants[index].previewUrl = URL.createObjectURL(file);
        // Lưu tạm tên file để hiển thị (chưa gửi server)
        state.variants[index].imageName = file.name; 
        UI.renderVariants(state.variants);
    }
}

// --- LOGIC: SAVE (QUAN TRỌNG) ---
async function handleSave(e) {
    e.preventDefault();

    // 1. Chuẩn bị FormData
    const formData = new FormData();
    
    // 2. Chuẩn bị JSON Payload
    const payload = {
        productDetailDTO: {
            productId: state.isEdit ? state.currentId : null,
            productName: document.getElementById("prodName").value.trim(),
            description: document.getElementById("prodDesc").value.trim(),
            price: parseFloat(document.getElementById("prodPrice").value) || 0,
            priceOriginal: parseFloat(document.getElementById("prodOriginalPrice").value) || 0,
            categoryId: document.getElementById("prodCate").value,
            brandId: document.getElementById("prodBrand").value,
            imageName: state.currentMainImageName // Giữ tên cũ, nếu có ảnh mới sẽ đè ở dưới
        },
        attributes: [],
        variants: [],
        variantValues: []
    };

    // Xử lý ảnh chính (Nếu có upload mới)
    if (state.mainImageFile) {
        const fName = state.mainImageFile.name;
        // Cập nhật tên ảnh mới vào DTO (bỏ đuôi mở rộng để clean)
        payload.productDetailDTO.imageName = fName.substring(0, fName.lastIndexOf('.')) || fName;
        formData.append("images", state.mainImageFile);
    }

    // 3. Xử lý Attributes
    state.currentAttributes.forEach((attr, attrIdx) => {
        // Nếu attributeId không có (tức là mới thêm), để null để backend tự tạo
        const attrId = attr.id && !attr.id.toString().startsWith("attr_") ? attr.id : null;

        const attributeValues = attr.values.map((valName) => {
            // Check xem value này đã có ID từ DB chưa
            const existingId = attr.valueIdMap?.[valName];
            // Nếu là ID tạm (bắt đầu bằng val_) thì gửi null
            const validValId = (existingId && !existingId.toString().startsWith("val_")) ? existingId : null;

            return {
                attributeValueId: validValId,
                attributeValueName: valName
            };
        });

        payload.attributes.push({
            attributeId: attrId,
            attributeName: attr.name, // Thêm tên attribute để backend biết đường tạo
            attributeValues: attributeValues
        });
    });

    // 4. Xử lý Variants
    state.variants.forEach((v, vIdx) => {
        // ID biến thể: Nếu là mới (new_...) hoặc null -> gửi null
        const varId = (v.id && !v.id.toString().startsWith("new_") && !v.id.toString().startsWith("var_")) 
            ? v.id 
            : null;

        let finalImageName = v.imageName || "";

        // Nếu variant có file ảnh mới upload
        if (v.rawFile) {
            const fName = v.rawFile.name;
            finalImageName = fName.substring(0, fName.lastIndexOf('.')) || fName;
            formData.append("images", v.rawFile); // Gom chung vào key "images"
        }

        const variantDTO = {
            variantId: varId,
            imageName: finalImageName,
            price: parseFloat(v.price) || 0,
            priceOriginal: parseFloat(v.priceOriginal) || parseFloat(v.price) || 0,
            stock: parseInt(v.stock) || 0
        };
        
        payload.variants.push(variantDTO);

        // Map Variant - Values
        // Logic: Dựa vào tên combo (VD: "Đỏ - L") để tìm lại ID của Value
        if (v.comboValues && v.comboValues.length > 0) {
            v.comboValues.forEach((valName) => {
                // Tìm attribute nào chứa valueName này
                const parentAttr = state.currentAttributes.find(a => a.values.includes(valName));
                
                // Note: Logic này phụ thuộc vào việc Backend xử lý map
                // Nếu backend cần ID, frontend phải tìm ID trong attributeValues vừa tạo ở bước 3.
                // Tuy nhiên, với variant mới, value mới chưa có ID.
                // Thường backend sẽ map dựa trên index hoặc tên. 
                // Ở đây ta gửi cấu trúc tham chiếu cơ bản:
                
                // Cách an toàn nhất: Gửi kèm tên giá trị để backend tự map
                // Nhưng theo cấu trúc cũ của bạn là gửi `attributeValueId`.
                // Nếu là mới hoàn toàn, client chưa có ID. Hy vọng backend của bạn thông minh xử lý đc.
                
                const valId = parentAttr?.valueIdMap?.[valName];
                // Chỉ gửi nếu có ID thực. Nếu không, backend phải tự suy diễn từ attributeValues.
                if (valId && !valId.toString().startsWith("val_")) {
                    payload.variantValues.push({
                        variantId: varId, // Có thể là null nếu variant mới
                        attributeValueId: valId
                    });
                } 
                // Nếu không có ID (value mới), ta không push vào variantValues
                // Backend sẽ phải tự tạo liên kết khi tạo xong AttributeValue.
            });
        }
    });

    console.log("📤 Payload JSON:", JSON.stringify(payload, null, 2));

    // 5. Đóng gói JSON vào Blob (QUAN TRỌNG)
    const jsonBlob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    formData.append("productDTO", jsonBlob, "productDTO.json");

    // 6. Gửi Request
    try {
        const res = await ProductService.save(formData);
        if (res && res.success) {
            await showDialog("success", "Lưu sản phẩm thành công!");
            UI.switchView('list');
            reloadData();
        } else {
            console.error(res);
            await showDialog("error", res?.message || "Có lỗi xảy ra khi lưu.");
        }
    } catch (error) {
        console.error("Save Error:", error);
        await showDialog("error", "Lỗi kết nối: " + error.message);
    }
}