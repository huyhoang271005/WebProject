export const ProductUI = {
    state: {
        categories: [],
        brands: [],
        attributes: [],
        selectedAttributes: [],
        variants: [],
        mainImageFile: null
    },

    // --- [MỚI] CHUYỂN ĐỔI GIỮA DANH SÁCH & FORM ---
    toggleView: (viewName) => {
        const listView = document.getElementById('listView');
        const createView = document.getElementById('createView');
        
        if (viewName === 'create') {
            listView.classList.add('d-none');
            createView.classList.remove('d-none');
        } else {
            listView.classList.remove('d-none');
            createView.classList.add('d-none');
        }
    },

    // --- [MỚI] RENDER DANH SÁCH SẢN PHẨM ---
    renderProductList: (products, categories, brands) => {
        const tbody = document.getElementById('productTableBody');
        
        if (!products || products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-muted">Chưa có sản phẩm nào.</td></tr>`;
            return;
        }

        const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

        tbody.innerHTML = products.map(p => {
            // Dùng so sánh lỏng (==) để tránh lỗi lệch kiểu (string/number) giữa ID sản phẩm và danh mục
            const catName = categories.find(c => c.categoryId == p.categoryId)?.categoryName || '<span class="text-muted fst-italic">---</span>';
            const brandName = brands.find(b => b.brandId == p.brandId)?.brandName || '<span class="text-muted fst-italic">---</span>';
            const imageUrl = p.imageUrl || 'https://placehold.co/50x50?text=No+Img';

            return `
                <tr>
                    <td class="ps-4">
                        <div class="d-flex align-items-center">
                            <img src="${imageUrl}" class="rounded border me-3" 
                                 style="width: 48px; height: 48px; object-fit: cover;" 
                                 alt="${p.productName}">
                            <div>
                                <div class="fw-bold text-dark text-truncate" style="max-width: 250px;">${p.productName}</div>
                                <small class="text-muted" style="font-size: 11px;">ID: ${p.productId?.substring(0, 8)}...</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="small text-secondary">${catName}</div>
                        <div class="fw-bold text-dark small">${brandName}</div>
                    </td>
                    <td class="text-danger fw-bold">${formatCurrency(p.price)}</td>
                    <td class="text-decoration-line-through text-muted small">${formatCurrency(p.originalPrice)}</td>
                    <td class="text-end pe-4">
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary border-0" title="Chỉnh sửa">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger border-0" title="Xóa">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // --- LOGIC CŨ (DROPDOWN & ATTRIBUTES) GIỮ NGUYÊN ---

    initSearchableDropdown: (selectId, items, displayField = 'name', valueField = 'id') => {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">-- Chọn --</option>';
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueField];
            option.textContent = item[displayField];
            select.appendChild(option);
        });
    },

    renderAttributeSelector: () => {
        const container = document.getElementById('attributesContainer');
        if (!container) return;
        container.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-body">
                    <h5 class="card-title text-primary">Biến thể sản phẩm</h5>
                    <button type="button" class="btn btn-sm btn-outline-primary mb-3" id="addAttributeBtn">
                        + Thêm thuộc tính
                    </button>
                    <div id="selectedAttributesList"></div>
                </div>
            </div>`;
        document.getElementById('addAttributeBtn').addEventListener('click', ProductUI.addAttributeRow);
    },

    addAttributeRow: () => {
        const list = document.getElementById('selectedAttributesList');
        const rowId = `attr_row_${Date.now()}`;
        const row = document.createElement('div');
        row.className = 'attribute-row mb-3 p-3 border rounded bg-light';
        row.id = rowId;
        row.innerHTML = `
            <div class="row align-items-end">
                <div class="col-md-5">
                    <label class="form-label small fw-bold">Thuộc tính</label>
                    <select class="form-select attribute-select">
                        <option value="">-- Chọn --</option>
                        ${ProductUI.state.attributes.map(attr => `<option value="${attr.attributeId}">${attr.attributeName}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label small fw-bold">Giá trị</label>
                    <textarea class="form-control attribute-values-input" rows="1" disabled></textarea>
                </div>
                <div class="col-md-1">
                    <button type="button" class="btn btn-outline-danger btn-sm w-100 remove-attr-btn"><i class="bi bi-x-lg"></i></button>
                </div>
            </div>
        `;
        list.appendChild(row);

        const attrSelect = row.querySelector('.attribute-select');
        const valuesInput = row.querySelector('.attribute-values-input');

        attrSelect.addEventListener('change', (e) => {
            valuesInput.disabled = !e.target.value;
            ProductUI.updateSelectedAttributes();
        });
        valuesInput.addEventListener('input', ProductUI.updateSelectedAttributes);
        row.querySelector('.remove-attr-btn').addEventListener('click', () => { 
            row.remove(); 
            ProductUI.updateSelectedAttributes(); 
        });
    },

    updateSelectedAttributes: () => {
        const rows = document.querySelectorAll('.attribute-row');
        const selectedAttributes = [];
        rows.forEach(row => {
            const attrSelect = row.querySelector('.attribute-select');
            const valuesInput = row.querySelector('.attribute-values-input');
            const attributeId = attrSelect.value;
            const valuesString = valuesInput.value;
            if (attributeId && valuesString.trim()) {
                const attribute = ProductUI.state.attributes.find(a => a.attributeId === attributeId);
                if (attribute) {
                    const values = valuesString.split(',').filter(v => v.trim()).map((name, idx) => ({
                        id: `${attributeId}_${idx}`, attributeValueId: null, name: name.trim()
                    }));
                    if (values.length > 0) selectedAttributes.push({ ...attribute, values });
                }
            }
        });
        ProductUI.state.selectedAttributes = selectedAttributes;
        ProductUI.updateVariantsFromAttributes();
    },

    updateVariantsFromAttributes: () => {
        import('./logic.js').then(({ ProductLogic }) => {
            ProductUI.state.variants = ProductLogic.generateVariants(ProductUI.state.selectedAttributes);
            ProductUI.renderVariantsTable();
        });
    },

    renderVariantsTable: () => {
        const container = document.getElementById('variantsContainer');
        if (!container) return;
        if (ProductUI.state.variants.length === 0) {
            container.innerHTML = ''; return;
        }
        container.innerHTML = `
            <div class="card shadow-sm mt-4"><div class="card-body">
                <h5 class="card-title text-primary">Danh sách biến thể</h5>
                <div class="table-responsive"><table class="table table-bordered table-hover align-middle">
                    <thead class="table-light"><tr><th>Tên</th><th>Ảnh</th><th>Giá gốc</th><th>Giá bán</th><th>Tồn</th></tr></thead>
                    <tbody id="variantsTableBody"></tbody>
                </table></div>
            </div></div>`;
        const tbody = document.getElementById('variantsTableBody');
        ProductUI.state.variants.forEach((v, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold">${v.displayName}</td>
                <td><input type="file" class="form-control form-control-sm v-img" data-i="${idx}"></td>
                <td><input type="number" class="form-control form-control-sm v-po" data-i="${idx}" value="${v.priceOriginal}"></td>
                <td><input type="number" class="form-control form-control-sm v-p" data-i="${idx}" value="${v.price}"></td>
                <td><input type="number" class="form-control form-control-sm v-s" data-i="${idx}" value="${v.stock}"></td>
            `;
            tbody.appendChild(tr);
        });
        tbody.querySelectorAll('input').forEach(i => i.addEventListener('change', (e) => {
            const idx = e.target.dataset.i;
            if (e.target.classList.contains('v-p')) ProductUI.state.variants[idx].price = parseFloat(e.target.value);
            if (e.target.classList.contains('v-po')) ProductUI.state.variants[idx].priceOriginal = parseFloat(e.target.value);
            if (e.target.classList.contains('v-s')) ProductUI.state.variants[idx].stock = parseInt(e.target.value);
            if (e.target.classList.contains('v-img')) ProductUI.state.variants[idx].imageFile = e.target.files[0];
        }));
    },

    handleMainImageUpload: (file) => {
        if (file) {
            ProductUI.state.mainImageFile = file;
            const reader = new FileReader();
            reader.onload = (e) => document.getElementById('mainImagePreview').innerHTML = `<img src="${e.target.result}" class="img-thumbnail mt-2" style="max-height: 150px;">`;
            reader.readAsDataURL(file);
        }
    }
};