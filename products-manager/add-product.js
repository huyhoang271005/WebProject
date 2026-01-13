import { showDialog } from "../dialog/index.js";
import { getLoader } from "../public/public.js";
import { fetchCategories, fetchBrands, fetchAttributes, createProduct } from "./services.js";

// DOM Elements
const productName = document.getElementById("productName");
const description = document.getElementById("description");
const originalPrice = document.getElementById("originalPrice");
const price = document.getElementById("price");
const stock = document.getElementById("stock"); // Add Stock
const categoryId = document.getElementById("categoryId");
const brandId = document.getElementById("brandId");

// Main Image Elements
const mainImageInput = document.getElementById("mainImageInput");
const mainImagePreview = document.getElementById("mainImagePreview");
const mainImagePlaceholder = document.getElementById("mainImagePlaceholder");

const attributesSection = document.getElementById("attributesSection");
const btnAddAttribute = document.getElementById("btnAddAttribute");
const variantsTableBody = document.querySelector("#variantsTable tbody");
const btnSave = document.getElementById("btnSave");
const btnCancel = document.getElementById("btnCancel");

// State
let attributes = []; // { id: timestamp, attributeId: "...", name: "Color", values: [] }
let availableAttributes = []; // Fetched from API

export function initAddProduct() {
    console.log("add-product.js: initAddProduct called");
    btnAddAttribute.addEventListener("click", addNewAttribute);
    btnSave.addEventListener("click", saveProduct);
    btnCancel.addEventListener("click", resetAddForm);

    // Main Image Preview
    mainImageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            mainImagePreview.src = URL.createObjectURL(file);
            mainImagePreview.style.display = "block";
            mainImagePlaceholder.style.display = "none";
        }
    });

    // Load metadata (Categories, Brands, Attributes)
    loadMetadata();
}

export function resetAddForm() {
    productName.value = "";
    description.value = "";
    originalPrice.value = "";
    price.value = "";
    categoryId.value = "";
    brandId.value = "";

    // Reset Main Image
    mainImageInput.value = "";
    mainImagePreview.src = "";
    mainImagePreview.style.display = "none";
    mainImagePlaceholder.style.display = "block";

    attributes = [];
    renderAttributes();
    variantsTableBody.innerHTML = "";
}

async function loadMetadata() {
    // Load Categories
    const catRes = await fetchCategories();
    if (catRes.success && catRes.data) {
        let html = '<option value="">-- Chọn danh mục --</option>';
        catRes.data.listData.forEach(c => {
            html += `<option value="${c.categoryId}">${c.categoryName}</option>`;
        });
        categoryId.innerHTML = html;
    }

    // Load Brands
    const brandRes = await fetchBrands();
    if (brandRes.success && brandRes.data) {
        let html = '<option value="">-- Chọn thương hiệu --</option>';
        brandRes.data.listData.forEach(b => {
            html += `<option value="${b.brandId}">${b.brandName}</option>`;
        });
        brandId.innerHTML = html;
    }

    // Load Attributes
    const attrRes = await fetchAttributes();
    if (attrRes.success && attrRes.data) {
        availableAttributes = attrRes.data.listData;
    }
}

// === ATTRIBUTE HANDLING ===
function addNewAttribute() {
    const id = Date.now();
    attributes.push({ id, attributeId: "", name: "", values: [] });
    renderAttributes();
}

function removeAttribute(id) {
    attributes = attributes.filter(a => a.id !== id);
    renderAttributes();
    generateVariants();
}

function updateAttributeSelection(id, attrId) {
    const attr = attributes.find(a => a.id === id);
    const selected = availableAttributes.find(a => a.attributeId === attrId);

    if (attr && selected) {
        attr.attributeId = selected.attributeId;
        attr.name = selected.attributeName;
        // Optionally: if the attribute has pre-defined values in API, we could load them.
        // But the user's data structure implies values are simple strings added here.
        // Checking "Add Product" JSON, "attributeValues": [{"attributeValueName": "X"}]
        // So we keep the tag input.
    }
}

function addAttributeValue(id, valueName) {
    const attr = attributes.find(a => a.id === id);
    if (attr && valueName.trim()) {
        if (!attr.values.includes(valueName.trim())) {
            attr.values.push(valueName.trim());
            renderAttributes(); // re-render to show tag
            generateVariants(); // regenerate table
        }
    }
}

function removeAttributeValue(id, valueName) {
    const attr = attributes.find(a => a.id === id);
    if (attr) {
        attr.values = attr.values.filter(v => v !== valueName);
        renderAttributes();
        generateVariants();
    }
}

function renderAttributes() {
    attributesSection.innerHTML = "";
    attributes.forEach(attr => {
        const el = document.createElement("div");
        el.className = "attribute-item";

        // Build Options for Select
        let optionsHtml = '<option value="">-- Chọn thuộc tính --</option>';
        availableAttributes.forEach(a => {
            // Disable if already selected by another row (optional, skipped for simplicity)
            const selected = (a.attributeId === attr.attributeId) ? "selected" : "";
            optionsHtml += `<option value="${a.attributeId}" ${selected}>${a.attributeName}</option>`;
        });

        el.innerHTML = `
            <div class="attribute-header">
                <select class="attr-select" style="width: 200px; padding: 6px; border:1px solid #ddd; border-radius:4px;">
                    ${optionsHtml}
                </select>
                <button class="remove-attr-btn"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="tags-input-container">
                ${attr.values.map(v => `
                    <div class="tag">
                        ${v} <i class="fa-solid fa-xmark remove-tag-btn" data-val="${v}"></i>
                    </div>
                `).join("")}
                <input type="text" class="tags-input" placeholder="+ Thêm giá trị (Enter)">
            </div>
        `;

        // Events
        const select = el.querySelector(".attr-select");
        select.addEventListener("change", (e) => updateAttributeSelection(attr.id, e.target.value));

        el.querySelector(".remove-attr-btn").onclick = () => removeAttribute(attr.id);

        const tagInput = el.querySelector(".tags-input");
        tagInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();

                // VALIDATION: Check if attribute name is selected
                if (!attr.attributeId) {
                    showDialog("error", "Vui lòng chọn tên thuộc tính trước khi nhập giá trị!");
                    return;
                }

                addAttributeValue(attr.id, tagInput.value);
                tagInput.value = "";
                tagInput.focus();
            }
        });

        el.querySelectorAll(".remove-tag-btn").forEach(btn => {
            btn.onclick = () => removeAttributeValue(attr.id, btn.dataset.val);
        });

        attributesSection.appendChild(el);
    });
}

// === VARIANT GENERATION ===
function generateVariants() {
    // Cartesian product
    const validAttributes = attributes.filter(a => a.attributeId && a.values.length > 0);

    if (validAttributes.length === 0) {
        variantsTableBody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:#888;'>Chọn thuộc tính và thêm giá trị để tạo biến thể</td></tr>";
        return;
    }

    // Capture existing state to preserve inputs
    const existingState = new Map();
    variantsTableBody.querySelectorAll("tr").forEach(tr => {
        if (tr.dataset.combo) {
            const comboKey = getComboKey(JSON.parse(tr.dataset.combo));
            existingState.set(comboKey, {
                original: tr.querySelector(".v-original").value,
                price: tr.querySelector(".v-price").value,
                stock: tr.querySelector(".v-stock").value
            });
        }
    });

    let combinations = [{}];
    validAttributes.forEach(attr => {
        const next = [];
        combinations.forEach(existing => {
            attr.values.forEach(val => {
                next.push({
                    ...existing,
                    [attr.name]: { valName: val, attrId: attr.attributeId }
                });
            });
        });
        combinations = next;
    });

    variantsTableBody.innerHTML = "";

    const basePrice = price.value || 0;
    const baseOriginal = originalPrice.value || 0;

    combinations.forEach((combo) => {
        // combo = { "Color": { valName: "Red", attrId: "123" }, "Size": ... }
        const name = Object.keys(combo).map(k => `${k}: ${combo[k].valName}`).join(" - ");
        const comboKey = getComboKey(combo);

        // Restore values if exist, else use defaults
        const saved = existingState.get(comboKey);
        const valOriginal = saved ? saved.original : baseOriginal;
        const valPrice = saved ? saved.price : basePrice;
        const valStock = saved ? saved.stock : 0;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <div class="image-upload-box" style="width: 50px; height: 50px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; cursor: pointer;">
                     <img src="" style="width: 100%; height: 100%; object-fit: cover; display: none;">
                     <i class="fa-solid fa-image" style="color: #ccc;"></i>
                     <input type="file" class="v-image-input" accept="image/*" style="opacity: 0; position: absolute; top:0; left:0; width:100%; height:100%; cursor: pointer;">
                </div>
            </td>
            <td>${name}</td>
            <td><input type="number" class="v-original" value="${valOriginal}" style="width:100px;"></td>
            <td><input type="number" class="v-price" value="${valPrice}" style="width:100px;"></td>
            <td><input type="number" class="v-stock" value="${valStock}" style="width:80px;"></td>
            <td><button class="remove-v-btn" style="color:red; border:none; background:none;"><i class="fa-solid fa-trash"></i></button></td>
        `;

        tr.dataset.combo = JSON.stringify(combo);

        // Image Preview Logic
        const imgInput = tr.querySelector(".v-image-input");
        const imgPreview = tr.querySelector("img");
        const icon = tr.querySelector("i");

        imgInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                imgPreview.src = URL.createObjectURL(file);
                imgPreview.style.display = "block";
                icon.style.display = "none";
            }
        };

        tr.querySelector(".remove-v-btn").onclick = () => {
            tr.remove();
        };

        variantsTableBody.appendChild(tr);
    });
}

function getComboKey(combo) {
    // Generate a consistent key for the combination map (sort by attribute name)
    return Object.keys(combo).sort().map(k => `${k}:${combo[k].valName}`).join("|");
}


// === SAVE ===
async function saveProduct() {
    // Basic Validation
    if (!productName.value.trim()) return showDialog("error", "Tên sản phẩm là bắt buộc");
    if (!categoryId.value) return showDialog("error", "Vui lòng chọn danh mục");
    if (!brandId.value) return showDialog("error", "Vui lòng chọn thương hiệu");

    const productDTO = {
        productName: productName.value.trim(),
        description: description.value.trim(),
        originalPrice: parseFloat(originalPrice.value) || 0,
        price: parseFloat(price.value) || 0,
        stock: parseInt(stock.value) || 0,
        categoryId: categoryId.value,
        brandId: brandId.value,
        attributes: attributes.map(a => ({
            attributeId: a.attributeId,
            attributeName: a.name,
            attributeValues: a.values.map(v => ({ attributeValueName: v }))
        })),
        variants: []
    };

    const formData = new FormData();

    // Append Main Image
    if (mainImageInput.files[0]) {
        formData.append('image', mainImageInput.files[0]);
    } else {
        // Should we send empty blob for main image? Usually optional.
        // formData.append('image', new Blob([], {type: 'application/octet-stream'}));
    }

    // Gather variants
    const rows = variantsTableBody.querySelectorAll("tr");

    rows.forEach((tr, index) => {
        if (!tr.dataset.combo) return;
        const combo = JSON.parse(tr.dataset.combo);
        const vOriginal = parseFloat(tr.querySelector(".v-original").value) || 0;
        const vPrice = parseFloat(tr.querySelector(".v-price").value) || 0;
        const vStock = parseInt(tr.querySelector(".v-stock").value) || 0;
        const vImgInput = tr.querySelector(".v-image-input");
        const file = vImgInput.files[0];

        let imgName = null;

        // Append Image with Key = ImageName (Backend requires this exact mapping)
        if (file) {
            // Generate unique name WITHOUT extension
            imgName = `variant-${index}-${Date.now()}`;

            // KEY must match the imageName in DTO
            formData.append(imgName, file);
        }

        const variantAttrs = Object.values(combo).map(item => ({
            attributeId: item.attrId,
            attributeValueName: item.valName
        }));

        productDTO.variants.push({
            originalPrice: vOriginal,
            price: vPrice,
            stock: vStock,
            imageName: imgName,
            active: true,
            attributeValues: variantAttrs
        });
    });

    // Log the DTO for debugging
    console.log("Final ProductDTO:", productDTO);
    // Log keys for debugging
    for (var pair of formData.entries()) {
        console.log(pair[0] + ', ' + pair[1]);
    }

    // Append JSON Blob
    formData.append('productDTO', new Blob([JSON.stringify(productDTO)], { type: 'application/json' }));

    // Send
    await getLoader("btnSave", async () => {
        const res = await createProduct(formData); // true for isMultipart

        if (res.success) {
            await showDialog("success", "Thêm sản phẩm thành công!");
            resetAddForm();
        } else {
            console.error("Server Error:", res);
            await showDialog("error", res.message || "Có lỗi xảy ra");
        }
    });
}
