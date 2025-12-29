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

    // --- SUA LOGIC RENDER BRANDS ---
    renderBrands: (brands, cateId, selectedBrandId = null) => {
        const brandSelect = document.getElementById("brandId");
        if (!brandSelect) return;
        
        // Reset option dau tien
        brandSelect.innerHTML = `<option value="">-- Chon thuong hieu --</option>`;

        if (!brands || brands.length === 0) {
            console.log("UI: Khong co du lieu brands de hien thi");
            return;
        }

        let filtered = brands;
        
        // Chi loc khi co cateId duoc chon
        if (cateId && cateId !== "") {
            // Chuyen ve String het de so sanh cho chac chan (tranh loi so vs chuoi)
            const cateIdStr = String(cateId);
            filtered = brands.filter(b => {
                // Kiem tra xem brand co truong categoryId khong
                if (!b.categoryId) return true; // Neu data loi khong co categoryId thi cu hien ra
                return String(b.categoryId) === cateIdStr;
            });
        }

        // Log de debug xem loc con lai bao nhieu
        console.log(`UI: Render brands. Total: ${brands.length}, Filtered by Cate(${cateId}): ${filtered.length}`);

        filtered.forEach(b => {
            // So sanh ID brand de set selected
            const isSelected = (selectedBrandId && String(b.brandId) === String(selectedBrandId)) ? 'selected' : '';
            brandSelect.innerHTML += `<option value="${b.brandId}" ${isSelected}>${b.brandName}</option>`;
        });
    },

    renderMainImage: (src) => {
        const preview = document.getElementById("mainImagePreview");
        if (!preview) return;
        if (src) preview.innerHTML = `<img src="${src}" class="img-fluid rounded shadow-sm" style="max-height: 200px;">`;
        else preview.innerHTML = ``;
    },

    addAttrRow: (nameVal = "", valuesVal = "", onInputCallback, attrId = null, valueIds = [], valueIdMap = {}, allAttributes = []) => {
        const container = document.getElementById("attributesContainer");
        if (!container) return;
        
        const div = document.createElement("div");
        div.className = "mb-3 attr-row";
        if (attrId) div.dataset.attrId = attrId;
        if (Object.keys(valueIdMap).length) div.dataset.valueIdMap = JSON.stringify(valueIdMap);
        
        const attrOptions = allAttributes.map(attr => 
            `<option value="${attr.attributeId}" ${attrId === attr.attributeId ? 'selected' : ''}>${attr.attributeName}</option>`
        ).join('');

        div.innerHTML = `
            <div class="row g-2 align-items-center">
                <div class="col-md-3">
                    <select class="inp-attr-select form-select">
                        <option value="">-- Chon thuoc tinh --</option>
                        ${attrOptions}
                    </select>
                </div>
                <div class="col-md-8">
                    <input type="text" class="inp-attr-vals form-control" value="${valuesVal}" placeholder="Nhap gia tri (ngan cach phay). VD: Do, Xanh">
                </div>
                <div class="col-md-1">
                    <button type="button" class="btn-remove btn btn-outline-danger w-100">Xoa</button>
                </div>
            </div>`;

        const selectEl = div.querySelector(".inp-attr-select");
        selectEl.onchange = (e) => {
            const selectedAttr = allAttributes.find(a => a.attributeId == e.target.value);
            if(selectedAttr) div.dataset.attrId = selectedAttr.attributeId;
            else delete div.dataset.attrId;
        };
        div.querySelector(".btn-remove").onclick = () => { div.remove(); };
        container.appendChild(div);
    },

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
                        <div class="col-auto"><strong>Thiet lap nhanh:</strong></div>
                        <div class="col"><input type="number" id="bulk_price_org" class="form-control form-control-sm" placeholder="Gia goc"></div>
                        <div class="col"><input type="number" id="bulk_price" class="form-control form-control-sm" placeholder="Gia ban"></div>
                        <div class="col"><input type="number" id="bulk_stock" class="form-control form-control-sm" placeholder="Kho"></div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-sm btn-primary" onclick="window.applyBulkInfo()">Ap dung</button>
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
                            <th style="width: 60px;">Anh</th>
                            <th class="text-start">Phan loai</th>
                            <th style="width: 130px;">Gia goc</th>
                            <th style="width: 130px;">Gia ban</th>
                            <th style="width: 100px;">Kho</th>
                            <th style="width: 50px;">Xoa</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${variants.map((v, i) => {
                            const imgSrc = v.previewUrl ? v.previewUrl : (v.imageUrl || "");
                            return `
                            <tr>
                                <td class="text-center">
                                    <div style="width: 48px; height: 48px; margin: 0 auto; cursor: pointer; border: 1px dashed #adb5bd;"
                                         onclick="document.getElementById('v_file_${i}').click()">
                                        ${imgSrc ? `<img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover;">` : `+`}
                                    </div>
                                    <input type="file" id="v_file_${i}" hidden onchange="window.handleSelectVariantImage(${i}, this)" accept="image/*">
                                </td>
                                <td>
                                    <strong>${v.name}</strong>
                                    <div class="small text-muted">${v.comboValues.join(" - ")}</div>
                                </td>
                                <td>
                                    <input type="number" class="form-control form-control-sm" 
                                        value="${v.priceOriginal || 0}" 
                                        onchange="window.updateVar(${i},'priceOriginal',this.value)">
                                </td>
                                <td>
                                    <input type="number" class="form-control form-control-sm fw-bold" 
                                        value="${v.price || 0}" 
                                        onchange="window.updateVar(${i},'price',this.value)">
                                </td>
                                <td>
                                    <input type="number" class="form-control form-control-sm text-center" 
                                        value="${v.stock || 0}" 
                                        onchange="window.updateVar(${i},'stock',this.value)">
                                </td>
                                <td class="text-center">
                                    <button type="button" onclick="window.removeVariant(${i})" class="btn btn-sm btn-link text-danger">X</button>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        wrapper.innerHTML = `
            <div class="mb-2"><strong>Danh sach phan loai (${variants.length})</strong></div>
            ${bulkActionHTML}
            ${tableHTML}
        `;
    },

    resetForm: (isEdit) => {
        const form = document.getElementById("productForm");
        const attrContainer = document.getElementById("attributesContainer");
        const variantWrapper = document.getElementById("variantsContainer");
        const formTitle = document.querySelector("#createView h2");
        
        if(form) form.reset();
        if(attrContainer) attrContainer.innerHTML = "";
        if(variantWrapper) variantWrapper.innerHTML = "";
        if(formTitle) formTitle.innerText = isEdit ? "Cap nhat san pham" : "Them San Pham Moi";
        UI.renderMainImage(null);
        
        // Reset luon brand select ve trang thai trong
        const brandSelect = document.getElementById("brandId");
        if (brandSelect) brandSelect.innerHTML = `<option value="">-- Chon thuong hieu --</option>`;
    }
};