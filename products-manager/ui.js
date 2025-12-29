// ui.js
export const UI = {
    // Cache sẵn các Element để đỡ query nhiều lần
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

    // --- 1. CHUYỂN ĐỔI MÀN HÌNH (QUAN TRỌNG) ---
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

    // --- 2. RENDER BẢNG DANH SÁCH ---
    renderTable: (products) => {
        const tbody = document.getElementById("productTableBody");
        if (!tbody) return;

        if (!products || !products.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">Không có dữ liệu</td></tr>`;
            return;
        }

        const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

        tbody.innerHTML = products.map(p => {
            // Xử lý ảnh: Ưu tiên imageUrl, fallback sang imageName
            let imgUrl = "https://via.placeholder.com/50";
            if (p.imageUrl) imgUrl = p.imageUrl;
            else if (p.imageName) imgUrl = `/images/${p.imageName}`; // Đường dẫn ảnh local nếu có

            // Xử lý giá gốc (Backend trả về OriginalPrice hoặc originalPrice)
            const pOrg = p.OriginalPrice || p.originalPrice || 0;
            const priceOriginalDisplay = pOrg > 0 ? fmt.format(pOrg) : '-';

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

    // --- 3. RENDER SELECT BRANDS ---
    renderBrands: (brands, cateId, selectedBrandId = null) => {
        const brandSelect = document.getElementById("brandId");
        if (!brandSelect) return;
        
        brandSelect.innerHTML = `<option value="">-- Chọn thương hiệu --</option>`;
        
        // Nếu API categories chưa có categoryId hoặc user chưa chọn -> vẫn hiện all hoặc ẩn tùy logic
        // Ở đây ta hiển thị brand theo category nếu có chọn cateId
        let filtered = brands;
        if (cateId) {
            filtered = brands.filter(b => b.categoryId == cateId);
        }

        filtered.forEach(b => {
            const selected = (selectedBrandId && b.brandId == selectedBrandId) ? 'selected' : '';
            brandSelect.innerHTML += `<option value="${b.brandId}" ${selected}>${b.brandName}</option>`;
        });
    },

    // --- 4. RENDER ẢNH PREVIEW ---
    renderMainImage: (src) => {
        const preview = document.getElementById("mainImagePreview");
        if (!preview) return;
        if (src) preview.innerHTML = `<img src="${src}" class="img-fluid rounded shadow-sm" style="max-height: 200px;">`;
        else preview.innerHTML = ``;
    },

    // --- 5. THÊM DÒNG THUỘC TÍNH (QUAN TRỌNG CHO LOGIC.JS) ---
    addAttrRow: (nameVal = "", valuesVal = "", onInputCallback, attrId = null, valueIds = [], valueIdMap = {}, allAttributes = []) => {
        const container = document.getElementById("attributesContainer");
        if (!container) return;
        
        const div = document.createElement("div");
        div.className = "mb-3 attr-row"; // Class này logic.js sẽ tìm
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

        // Gán sự kiện
        const selectEl = div.querySelector(".inp-attr-select");
        const inputEl = div.querySelector(".inp-attr-vals");
        
        // Khi chọn tên thuộc tính có sẵn
        selectEl.onchange = (e) => {
            // Logic tìm attributeId để gán vào dataset
            const selectedAttr = allAttributes.find(a => a.attributeId == e.target.value);
            if(selectedAttr) {
                 div.dataset.attrId = selectedAttr.attributeId;
                 // Tùy chọn: Tự điền giá trị gợi ý nếu muốn
            } else {
                 delete div.dataset.attrId;
            }
        };
        
        div.querySelector(".btn-remove").onclick = () => { div.remove(); };
        container.appendChild(div);
    },

    // --- 6. RENDER BIẾN THỂ ---
    renderVariants: (variants) => {
        const wrapper = document.getElementById("variantsContainer");
        if (!wrapper) return;

        if (!variants || !variants.length) {
            wrapper.innerHTML = "";
            return;
        }

        // HTML Bulk Edit (Sửa hàng loạt)
        const bulkActionHTML = `
            <div class="card bg-light mb-3 border-secondary border-opacity-25">
                <div class="card-body py-2">
                    <div class="row g-2 align-items-end">
                        <div class="col-auto"><strong class="text-primary small"><i class="bi bi-gear-fill me-1"></i>Thiết lập nhanh:</strong></div>
                        <div class="col"><input type="number" id="bulk_price_org" class="form-control form-control-sm" placeholder="Giá gốc chung"></div>
                        <div class="col"><input type="number" id="bulk_price" class="form-control form-control-sm" placeholder="Giá bán chung"></div>
                        <div class="col"><input type="number" id="bulk_stock" class="form-control form-control-sm" placeholder="Kho chung"></div>
                        <div class="col-auto">
                            <button type="button" class="btn btn-sm btn-primary" onclick="window.applyBulkInfo()">Áp dụng</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // HTML Table
        const tableHTML = `
            <div class="table-responsive">
                <table class="table table-bordered table-hover align-middle mb-0" style="font-size: 14px;">
                    <thead class="table-light text-center">
                        <tr>
                            <th style="width: 60px;">Ảnh</th>
                            <th class="text-start">Phân loại hàng</th>
                            <th style="width: 130px;">Giá gốc (₫)</th>
                            <th style="width: 130px;">Giá bán (₫)</th>
                            <th style="width: 100px;">Kho</th>
                            <th style="width: 50px;">Xóa</th>
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
                                        value="${v.priceOriginal || 0}" 
                                        onchange="window.updateVar(${i},'priceOriginal',this.value)" placeholder="0">
                                </td>
                                <td>
                                    <input type="number" class="form-control form-control-sm fw-bold text-success" 
                                        value="${v.price || 0}" 
                                        onchange="window.updateVar(${i},'price',this.value)" placeholder="0">
                                </td>
                                <td>
                                    <input type="number" class="form-control form-control-sm text-center" 
                                        value="${v.stock || 0}" 
                                        onchange="window.updateVar(${i},'stock',this.value)" placeholder="0">
                                </td>
                                <td class="text-center">
                                    <button type="button" onclick="window.removeVariant(${i})" class="btn btn-sm btn-link text-danger p-0">
                                        <i class="bi bi-x-circle-fill"></i>
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