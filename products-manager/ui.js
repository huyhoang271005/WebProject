// ui.js
export const UI = {
    els: {
        list: document.getElementById("listView"),
        form: document.getElementById("createView"),
        cateSelect: document.getElementById("categoryId"),
        brandSelect: document.getElementById("brandId"),
        attrContainer: document.getElementById("attributesContainer"),
        variantWrapper: document.getElementById("variantsContainer"),
        formTitle: document.querySelector("#createView h2"),
        mainImgPreview: document.getElementById("mainImagePreview"),
        mainImgInput: document.getElementById("mainImage")
    },

    switchView: (viewName) => {
        const listEl = document.getElementById("listView");
        const formEl = document.getElementById("createView");
        
        if (viewName === 'list') {
            if(listEl) listEl.classList.remove('d-none');
            if(formEl) formEl.classList.add('d-none');
        } else {
            if(listEl) listEl.classList.add('d-none');
            if(formEl) formEl.classList.remove('d-none');
        }
    },

    // Render categories vào select
    renderCategories: (categories) => {
        const cateSelect = document.getElementById("categoryId");
        if (!cateSelect) return;
        
        console.log("Rendering categories:", categories.length);
        cateSelect.innerHTML = `<option value="">-- Chọn danh mục --</option>`;
        
        categories.forEach(c => {
            cateSelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
        });
    },

    // Render brands vào select (có lọc theo category)
    renderBrands: (allBrands, selectedCateId = "", selectedBrandId = null) => {
        const brandSelect = document.getElementById("brandId");
        if (!brandSelect) {
            console.error("Không tìm thấy brandId select");
            return;
        }
        
        console.log("Rendering brands:", {
            total: allBrands.length,
            selectedCateId,
            selectedBrandId
        });
        
        brandSelect.innerHTML = `<option value="">-- Chọn thương hiệu --</option>`;
        
        if (!allBrands || allBrands.length === 0) {
            console.warn("Brands array trống");
            return;
        }

        // Lọc brands theo category
        let filtered = allBrands;
        
        if (selectedCateId && selectedCateId !== "") {
            filtered = allBrands.filter(b => {
                const bCateId = b.categoryId;
                // Nếu brand không có categoryId thì hiển thị
                if (!bCateId) return true;
                return String(bCateId) === String(selectedCateId);
            });
            console.log("Filtered brands:", filtered.length);
        }

        // Render options
        filtered.forEach(b => {
            const isSelected = (selectedBrandId && String(b.brandId) === String(selectedBrandId)) ? 'selected' : '';
            brandSelect.innerHTML += `<option value="${b.brandId}" ${isSelected}>${b.brandName}</option>`;
        });

        console.log("✅ Đã render", filtered.length, "brands vào dropdown");
    },

    // Render ảnh chính
    renderMainImage: (src) => {
        const preview = document.getElementById("mainImagePreview");
        if (!preview) return;
        
        if (src) {
            preview.innerHTML = `<img src="${src}" class="img-fluid rounded shadow-sm" style="max-height: 200px;">`;
        } else {
            preview.innerHTML = ``;
        }
    },

    // Thêm 1 dòng attribute
    addAttrRow: (selectedAttrId = "", valuesStr = "", allAttributes = []) => {
        const container = document.getElementById("attributesContainer");
        if (!container) return;
        
        const div = document.createElement("div");
        div.className = "mb-3 attr-row";
        if (selectedAttrId) div.dataset.attrId = selectedAttrId;
        
        // Build options từ allAttributes
        const attrOptions = allAttributes.map(attr => {
            const selected = (selectedAttrId === attr.attributeId) ? 'selected' : '';
            return `<option value="${attr.attributeId}" ${selected}>${attr.attributeName}</option>`;
        }).join('');

        div.innerHTML = `
            <div class="row g-2 align-items-center">
                <div class="col-md-3">
                    <select class="inp-attr-select form-select">
                        <option value="">-- Chọn thuộc tính --</option>
                        ${attrOptions}
                    </select>
                </div>
                <div class="col-md-8">
                    <input type="text" class="inp-attr-vals form-control" value="${valuesStr}" 
                           placeholder="Nhập giá trị (ngăn cách bởi dấu phay). VD: Đỏ, Xanh, Vàng">
                </div>
                <div class="col-md-1">
                    <button type="button" class="btn-remove btn btn-outline-danger w-100">Xóa</button>
                </div>
            </div>`;

        // Event: Khi chọn attribute
        const selectEl = div.querySelector(".inp-attr-select");
        selectEl.onchange = (e) => {
            const selectedAttr = allAttributes.find(a => a.attributeId === e.target.value);
            if (selectedAttr) {
                div.dataset.attrId = selectedAttr.attributeId;
                
                // Tự động điền values nếu attribute có sẵn values
                if (selectedAttr.attributeValues && selectedAttr.attributeValues.length > 0) {
                    const inputEl = div.querySelector(".inp-attr-vals");
                    const existingVals = inputEl.value.trim();
                    
                    if (!existingVals) {
                        const valueNames = selectedAttr.attributeValues.map(v => v.attributeValueName).join(", ");
                        inputEl.value = valueNames;
                        
                        // Lưu valueIdMap
                        const valueIdMap = {};
                        selectedAttr.attributeValues.forEach(v => {
                            valueIdMap[v.attributeValueName] = v.attributeValueId;
                        });
                        div.dataset.valueIdMap = JSON.stringify(valueIdMap);
                    }
                }
            } else {
                delete div.dataset.attrId;
            }
        };
        
        // Event: Xóa dòng
        div.querySelector(".btn-remove").onclick = () => div.remove();
        
        container.appendChild(div);
    },

    // Render danh sách variants
    renderVariants: (variants) => {
        const wrapper = document.getElementById("variantsContainer");
        if (!wrapper) return;

        if (!variants || !variants.length) {
            wrapper.innerHTML = "";
            return;
        }

        const bulkActionHTML = `
            <div class="card bg-light mb-3">
                <div class="card-body py-2">
                    <div class="row g-2 align-items-end">
                        <div class="col-auto"><strong>Thiết lập nhanh:</strong></div>
                        <div class="col">
                            <input type="number" id="bulk_price_org" class="form-control form-control-sm" 
                                   placeholder="Giá gốc" min="0" step="1000">
                        </div>
                        <div class="col">
                            <input type="number" id="bulk_price" class="form-control form-control-sm" 
                                   placeholder="Giá bán" min="0" step="1000">
                        </div>
                        <div class="col">
                            <input type="number" id="bulk_stock" class="form-control form-control-sm" 
                                   placeholder="Kho" min="0">
                        </div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-sm btn-primary" 
                                    onclick="window.applyBulkInfo()">Áp dụng</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const tableHTML = `
            <div class="table-responsive">
                <table class="table table-bordered table-hover align-middle mb-0" style="font-size: 14px;">
                    <thead class="table-light text-center">
                        <tr>
                            <th style="width: 60px;">Ảnh</th>
                            <th class="text-start">Phân loại</th>
                            <th style="width: 130px;">Giá gốc</th>
                            <th style="width: 130px;">Giá bán</th>
                            <th style="width: 100px;">Kho</th>
                            <th style="width: 50px;">Xóa</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${variants.map((v, i) => {
                            const imgSrc = v.previewUrl || v.imageUrl || "";
                            return `
                            <tr>
                                <td class="text-center">
                                    <div style="width: 48px; height: 48px; margin: 0 auto; cursor: pointer; 
                                                border: 1px dashed #adb5bd; border-radius: 4px; overflow: hidden;
                                                display: flex; align-items: center; justify-content: center;"
                                         onclick="document.getElementById('v_file_${i}').click()">
                                        ${imgSrc ? 
                                            `<img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover;">` : 
                                            `<span style="color: #adb5bd; font-size: 20px;">+</span>`
                                        }
                                    </div>
                                    <input type="file" id="v_file_${i}" hidden 
                                           onchange="window.handleSelectVariantImage(${i}, this)" 
                                           accept="image/*">
                                </td>
                                <td>
                                    <strong>${v.name}</strong>
                                    <div class="small text-muted">${v.comboValues.join(" • ")}</div>
                                </td>
                                <td>
                                    <input type="number" class="form-control form-control-sm" 
                                           value="${v.priceOriginal || 0}" min="0" step="1000"
                                           onchange="window.updateVar(${i},'priceOriginal',this.value)">
                                </td>
                                <td>
                                    <input type="number" class="form-control form-control-sm fw-bold" 
                                           value="${v.price || 0}" min="0" step="1000"
                                           onchange="window.updateVar(${i},'price',this.value)">
                                </td>
                                <td>
                                    <input type="number" class="form-control form-control-sm text-center" 
                                           value="${v.stock || 0}" min="0"
                                           onchange="window.updateVar(${i},'stock',this.value)">
                                </td>
                                <td class="text-center">
                                    <button type="button" onclick="window.removeVariant(${i})" 
                                            class="btn btn-sm btn-link text-danger p-0">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        wrapper.innerHTML = `
            <div class="card shadow-sm mb-4">
                <div class="card-header bg-white">
                    <strong>Danh sách phân loại (${variants.length})</strong>
                </div>
                <div class="card-body">
                    ${bulkActionHTML}
                    ${tableHTML}
                </div>
            </div>
        `;
    },

    // Reset form
    resetForm: (isEdit = false) => {
        const form = document.getElementById("productForm");
        const attrContainer = document.getElementById("attributesContainer");
        const variantWrapper = document.getElementById("variantsContainer");
        const formTitle = document.querySelector("#createView h2");
        
        if (form) form.reset();
        if (attrContainer) attrContainer.innerHTML = "";
        if (variantWrapper) variantWrapper.innerHTML = "";
        if (formTitle) formTitle.innerText = isEdit ? "Cập nhật sản phẩm" : "Thêm Sản Phẩm Mới";
        
        UI.renderMainImage(null);
    }
};