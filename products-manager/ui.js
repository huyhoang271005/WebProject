export const ProductUI = {
    state: {
        categories: [],
        brands: [],
        attributes: [],
        selectedAttributes: [],
        variants: [],
        mainImageFile: null
    },

    // [MỚI] Chuyển đổi qua lại giữa List và Form
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

    // [MỚI] Render danh sách sản phẩm
    renderProductList: (products, categories, brands) => {
        const tbody = document.getElementById('productTableBody');
        
        if (!products || products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">Chưa có sản phẩm nào.</td></tr>`;
            return;
        }

        const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

        tbody.innerHTML = products.map(p => {
            // Map tên Category và Brand
            const catName = categories.find(c => c.categoryId === p.categoryId)?.categoryName || '<span class="text-muted fst-italic">---</span>';
            const brandName = brands.find(b => b.brandId === p.brandId)?.brandName || '<span class="text-muted fst-italic">---</span>';
            
            // Xử lý ảnh: dùng ảnh placeholder nếu null
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
                    <td>
                        <span class="badge bg-light text-dark border">
                             ⭐ ${p.ratingAvg || 0} <span class="text-muted fw-normal">(${p.ratingCount || 0})</span>
                        </span>
                    </td>
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

    // Initialize dropdowns với search (Giữ nguyên)
    initSearchableDropdown: (selectId, items, displayField = 'name', valueField = 'id') => { /* ... giữ nguyên code cũ ... */ },

    // Render attribute selector (Giữ nguyên)
    renderAttributeSelector: () => {
        const container = document.getElementById('attributesContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-body">
                    <h5 class="card-title text-primary">Biến thể sản phẩm</h5>
                    <p class="text-muted small">Thêm các thuộc tính như Màu sắc, Kích thước để tạo các phiên bản khác nhau.</p>
                    <button type="button" class="btn btn-sm btn-outline-primary mb-3" id="addAttributeBtn">
                        + Thêm thuộc tính
                    </button>
                    <div id="selectedAttributesList"></div>
                </div>
            </div>
        `;
        document.getElementById('addAttributeBtn').addEventListener('click', ProductUI.addAttributeRow);
    },

    // Thêm một hàng attribute (Giữ nguyên)
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
                    <label class="form-label small fw-bold">Giá trị (cách nhau bởi dấu phẩy)</label>
                    <textarea class="form-control attribute-values-input" rows="1" placeholder="VD: Đỏ, Xanh, Vàng" disabled></textarea>
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
            if (e.target.value) {
                valuesInput.disabled = false;
                valuesInput.focus();
            } else {
                valuesInput.disabled = true;
                valuesInput.value = '';
            }
            ProductUI.updateSelectedAttributes();
        });

        valuesInput.addEventListener('input', ProductUI.updateSelectedAttributes);
        row.querySelector('.remove-attr-btn').addEventListener('click', () => {
            row.remove();
            ProductUI.updateSelectedAttributes();
        });
    },

    // Update danh sách attributes (Giữ nguyên logic)
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
                    const values = valuesString.split(',').map(v => v.trim()).filter(v => v.length > 0)
                        .map((name, index) => ({ id: `${attributeId}_${index}_${Date.now()}`, attributeValueId: null, name: name }));
                    if (values.length > 0) {
                        selectedAttributes.push({ attributeId: attribute.attributeId, attributeName: attribute.attributeName, values: values });
                    }
                }
            }
        });
        ProductUI.state.selectedAttributes = selectedAttributes;
        ProductUI.updateVariantsFromAttributes();
    },

    updateVariantsFromAttributes: () => {
        import('./logic.js').then(({ ProductLogic }) => {
            const variants = ProductLogic.generateVariants(ProductUI.state.selectedAttributes);
            ProductUI.state.variants = variants;
            ProductUI.renderVariantsTable();
        });
    },

    // Render bảng variants (Giữ nguyên)
    renderVariantsTable: () => {
        const container = document.getElementById('variantsContainer');
        if (!container) return;
        if (ProductUI.state.variants.length === 0) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = `
            <div class="card shadow-sm mt-4">
                <div class="card-body">
                    <h5 class="card-title text-primary">Danh sách biến thể (${ProductUI.state.variants.length})</h5>
                    <div class="table-responsive">
                        <table class="table table-bordered table-hover align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th>Tên biến thể</th>
                                    <th style="width: 200px">Ảnh</th>
                                    <th>Giá gốc</th>
                                    <th>Giá bán</th>
                                    <th>Tồn kho</th>
                                </tr>
                            </thead>
                            <tbody id="variantsTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        const tbody = document.getElementById('variantsTableBody');
        ProductUI.state.variants.forEach((variant, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="fw-bold">${variant.displayName}</td>
                <td>
                    <input type="file" class="form-control form-control-sm variant-image" data-index="${index}" accept="image/*">
                </td>
                <td><input type="number" class="form-control form-control-sm variant-price-original" data-index="${index}" value="${variant.priceOriginal}" min="0"></td>
                <td><input type="number" class="form-control form-control-sm variant-price" data-index="${index}" value="${variant.price}" min="0"></td>
                <td><input type="number" class="form-control form-control-sm variant-stock" data-index="${index}" value="${variant.stock}" min="0"></td>
            `;
            tbody.appendChild(row);
        });

        // Attach events for inputs
        tbody.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                const fieldMap = {
                    'variant-price-original': 'priceOriginal',
                    'variant-price': 'price',
                    'variant-stock': 'stock'
                };
                
                // Check class to determine field
                for (const [cls, field] of Object.entries(fieldMap)) {
                    if (e.target.classList.contains(cls)) {
                        ProductUI.state.variants[idx][field] = parseFloat(e.target.value) || 0;
                    }
                }
                
                // Handle file separately
                if (e.target.classList.contains('variant-image')) {
                     ProductUI.state.variants[idx].imageFile = e.target.files[0];
                }
            });
        });
    },

    // Handle main image upload (Giữ nguyên)
    handleMainImageUpload: (file) => {
        if (file) {
            ProductUI.state.mainImageFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('mainImagePreview');
                if (preview) {
                    preview.innerHTML = `<img src="${e.target.result}" class="img-thumbnail mt-2" style="max-height: 150px;">`;
                }
            };
            reader.readAsDataURL(file);
        }
    }
};