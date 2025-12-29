// ui.js
export const UI = {
    // Cache sẵn các Element quan trọng
    els: {
        list: document.getElementById("listView"),
        form: document.getElementById("createView"),
        
        tableBody: document.getElementById("productTableBody"), 
        
        cateSelect: document.getElementById("categoryId"),
        brandSelect: document.getElementById("brandId"),
        attrContainer: document.getElementById("attributesContainer"),
        variantWrapper: document.getElementById("variantsContainer"),
        formTitle: document.querySelector("#createView h2"),
        mainImgPreview: document.getElementById("mainImagePreview"),
        mainImgInput: document.getElementById("mainImage")
    },

    // Chuyển đổi giữa màn hình Danh sách và Màn hình Form
    switchView: (viewName) => {
        const listView = document.getElementById("listView");
        const createView = document.getElementById("createView");

        if (viewName === 'list') {
            if(listView) listView.classList.remove('d-none');
            if(createView) createView.classList.add('d-none');
        } else {
            if(listView) listView.classList.add('d-none');
            if(createView) createView.classList.remove('d-none');
        }
    },

    // Render bảng sản phẩm
    renderTable: (products) => {
        const tbody = document.getElementById("productTableBody");
        if (!tbody) return;

        if (!products || !products.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5 text-muted">
                        Không có dữ liệu hoặc chưa tải được sản phẩm
                    </td>
                </tr>`;
            return;
        }

        const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

        tbody.innerHTML = products.map(p => {
            let imgUrl = "https://via.placeholder.com/50";
            if (p.imageUrl) imgUrl = p.imageUrl;
            else if (p.imageName) imgUrl = `/images/${p.imageName}`;

            const priceOriginalDisplay = (p.originalPrice && p.originalPrice > 0)
                ? fmt.format(p.originalPrice) 
                : '-';

            const variantCount = p.variants ? p.variants.length : 0;
            const variantBadge = variantCount > 0 
                ? `<span class="badge bg-info text-white">${variantCount} loại</span>` 
                : `<span class="badge bg-secondary">Đơn thể</span>`;

            return `
            <tr>
                <td class="ps-4">
                    <div class="d-flex align-items-center gap-3">
                        <img src="${imgUrl}" style="width:50px; height:50px; object-fit:cover; border-radius:4px; border: 1px solid #dee2e6;">
                        <strong>${p.productName}</strong>
                    </div>
                </td>
                <td>${p.categoryName || '-'} <br> <small class="text-muted">${p.brandName || '-'}</small></td>
                <td style="color: #999; text-decoration: line-through;">${priceOriginalDisplay}</td>
                <td style="color:#d32f2f; font-weight:bold; font-size:1.1em">${fmt.format(p.price)}</td>
                <td>${variantBadge}</td>
                <td class="text-end pe-4">
                    <button onclick="window.editProduct('${p.productId}')" class="btn btn-sm btn-outline-primary" title="Sửa"><i class="bi bi-pencil-square"></i></button>
                    <button onclick="window.deleteProduct('${p.productId}')" class="btn btn-sm btn-outline-danger" title="Xóa"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    },

    renderBrands: (brands, cateId, selectedBrandId = null) => {
        const brandSelect = document.getElementById("brandId");
        if (!brandSelect) return;
        brandSelect.innerHTML = `<option value="">-- Chọn thương hiệu --</option>`;
        
        if (!cateId) return;
        
        // Filter brand theo categoryId (chú ý kiểu dữ liệu string/number)
        const filtered = brands.filter(b => b.categoryId == cateId);
        
        (filtered.length ? filtered : []).forEach(b => {
            const selected = (selectedBrandId && b.brandId == selectedBrandId) ? 'selected' : '';
            brandSelect.innerHTML += `<option value="${b.brandId}" ${selected}>${b.brandName}</option>`;
        });
    },

    renderMainImage: (src) => {
        const preview = document.getElementById("mainImagePreview");
        if (!preview) return;
        if (src) preview.innerHTML = `<img src="${src}" class="img-fluid rounded" style="max-height: 200px; border: 1px solid #ddd; padding: 4px;">`;
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
                        <option value="">-- Chọn thuộc tính --</option>
                        ${attrOptions}
                    </select>
                </div>
                <div class="col-md-8">
                    <input type="text" class="inp-attr-vals form-control" value="${valuesVal}" placeholder="Nhập giá trị (ngăn cách phẩy). VD: Đỏ, Xanh, Vàng">
                </div>
                <div class="col-md-1">
                    <button type="button" class="btn-remove btn btn-outline-danger w-100"><i class="bi bi-x-lg"></i></button>
                </div>
            </div>`;

        const selectEl = div.querySelector(".inp-attr-select");
        const inputEl = div.querySelector(".inp-attr-vals");
        
        selectEl.onchange = (e) => {
            const selectedAttr = allAttributes.find(a => a.attributeId == e.target.value);
            if(selectedAttr) {
                 div.dataset.attrId = selectedAttr.attributeId;
                 // Nếu chọn attribute có sẵn, tự điền value mẫu nếu muốn
                 // if(selectedAttr.attributeValues && selectedAttr.attributeValues.length) {
                 //    inputEl.value = selectedAttr.attributeValues.map(v => v.attributeValueName).join(", ");
                 // }
            } else {
                 delete div.dataset.attrId;
            }
            if(onInputCallback) onInputCallback();
        }
        
        inputEl.oninput = () => { if(onInputCallback) onInputCallback(); };
        div.querySelector(".btn-remove").onclick = () => { div.remove(); if(onInputCallback) onInputCallback(); };
        
        container.appendChild(div);
    },

    renderVariants: (variants) => {
        const wrapper = document.getElementById("variantsContainer");
        if (!wrapper) return;

        if (!variants || !variants.length) {
            wrapper.innerHTML = "";
            return;
        }

        // HTML Thanh thao tác hàng loạt
        const bulkActionHTML = `
            <div class="card bg-light mb-3 border-primary border-opacity-25">
                <div class="card-body py-2">
                    <div class="row g-2 align-items-end">
                        <div class="col-auto"><strong class="text-primary small"><i class="bi bi-layers-fill me-1"></i>Thiết lập hàng loạt:</strong></div>
                        <div class="col"><input type="number" id="bulk_price_org" class="form-control form-control-sm" placeholder="Giá gốc chung"></div>
                        <div class="col"><input type="number" id="bulk_price" class="form-control form-control-sm" placeholder="Giá bán chung"></div>
                        <div class="col"><input type="number" id="bulk_stock" class="form-control form-control-sm" placeholder="Kho chung"></div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-sm btn-primary" onclick="window.applyBulkInfo()">
                                <i class="bi bi-check2-all"></i> Áp dụng
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // HTML Bảng danh sách
        const tableHTML = `
            <div class="table-responsive">
                <table class="table table-bordered table-hover align-middle mb-0" style="font-size: 14px;">
                    <thead class="table-light text-center text-muted">
                        <tr>
                            <th style="width: 60px;">Ảnh</th>
                            <th class="text-start">Tên phân loại</th>
                            <th style="width: 140px;">Giá gốc (₫)</th>
                            <th style="width: 140px;">Giá bán (₫)</th>
                            <th style="width: 100px;">Kho</th>
                            <th style="width: 50px;"><i class="bi bi-trash"></i></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${variants.map((v, i) => {
                            const imgSrc = v.previewUrl ? v.previewUrl : (v.imageUrl || "");
                            return `
                            <tr>
                                <td class="text-center">
                                    <div style="width: 48px; height: 48px; margin: 0 auto; cursor: pointer; border: 1px dashed #adb5bd; border-radius: 4px; overflow: hidden; position: relative; background: #fff;"
                                         onclick="document.getElementById('v_file_${i}').click()"
                                         title="Tải ảnh lên">
                                        ${imgSrc 
                                            ? `<img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover;">` 
                                            : `<div class="d-flex align-items-center justify-content-center h-100 text-secondary"><i class="bi bi-camera-fill"></i></div>`
                                        }
                                    </div>
                                    <input type="file" id="v_file_${i}" hidden onchange="window.handleSelectVariantImage(${i}, this)" accept="image/*">
                                </td>
                                <td>
                                    <strong class="text-dark">${v.name}</strong>
                                    <div class="small text-muted">${v.comboValues.join(" - ")}</div>
                                </td>
                                <td>
                                    <input type="number" class="form-control form-control-sm" 
                                        value="${v.priceOriginal}" 
                                        onchange="window.updateVar(${i},'priceOriginal',this.value)" placeholder="0">
                                </td>
                                <td>
                                    <input type="number" class="form-control form-control-sm fw-bold text-success" 
                                        value="${v.price}" 
                                        onchange="window.updateVar(${i},'price',this.value)" placeholder="0">
                                </td>
                                <td>
                                    <input type="number" class="form-control form-control-sm text-center" 
                                        value="${v.stock}" 
                                        onchange="window.updateVar(${i},'stock',this.value)" placeholder="0">
                                </td>
                                <td class="text-center">
                                    <button type="button" onclick="window.removeVariant(${i})" class="btn btn-sm btn-link text-danger p-0">
                                        <i class="bi bi-x-circle-fill" style="font-size: 1.2rem;"></i>
                                    </button>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        wrapper.innerHTML = `
            <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="fw-bold m-0 text-primary">Danh sách phân loại hàng (${variants.length})</h6>
            </div>
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
        if(formTitle) formTitle.innerText = isEdit ? "Cập nhật sản phẩm" : "Thêm Sản Phẩm Mới";
        UI.renderMainImage(null);
    }
};