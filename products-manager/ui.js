export const ProductUI = {
    state: {
        categories: [],
        brands: [],
        attributes: [],
        selectedAttributes: [],
        variants: [],
        mainImageFile: null
    },

    // Initialize dropdowns với search
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

        const wrapper = select.parentElement;
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'form-control mb-2';
        searchInput.placeholder = `Tìm kiếm...`;
        searchInput.setAttribute('list', `${selectId}-datalist`);
        
        const datalist = document.createElement('datalist');
        datalist.id = `${selectId}-datalist`;
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[displayField];
            option.setAttribute('data-id', item[valueField]);
            datalist.appendChild(option);
        });
        wrapper.appendChild(datalist);

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            Array.from(select.options).forEach(option => {
                if (option.value === '') return;
                const text = option.textContent.toLowerCase();
                option.style.display = text.includes(searchTerm) ? '' : 'none';
            });

            const exactMatch = items.find(item => 
                item[displayField].toLowerCase() === searchTerm
            );
            if (exactMatch) {
                select.value = exactMatch[valueField];
                select.dispatchEvent(new Event('change'));
            }
        });

        searchInput.addEventListener('change', (e) => {
            const selectedText = e.target.value;
            const matchedItem = items.find(item => item[displayField] === selectedText);
            if (matchedItem) {
                select.value = matchedItem[valueField];
                select.dispatchEvent(new Event('change'));
            }
        });

        wrapper.insertBefore(searchInput, select);
    },

    renderAttributeSelector: () => {
        const container = document.getElementById('attributesContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Thêm thuộc tính biến thể</h5>
                    <button type="button" class="btn btn-sm btn-primary mb-3" id="addAttributeBtn">
                        + Thêm thuộc tính
                    </button>
                    <div id="selectedAttributesList"></div>
                </div>
            </div>
        `;

        document.getElementById('addAttributeBtn').addEventListener('click', () => {
            ProductUI.addAttributeRow();
        });
    },

    addAttributeRow: () => {
        const list = document.getElementById('selectedAttributesList');
        const rowId = `attr_row_${Date.now()}`;

        const row = document.createElement('div');
        row.className = 'attribute-row mb-3 p-3 border rounded';
        row.id = rowId;
        row.innerHTML = `
            <div class="row align-items-end">
                <div class="col-md-5">
                    <label class="form-label">Chọn thuộc tính</label>
                    <select class="form-select attribute-select">
                        <option value="">-- Chọn thuộc tính --</option>
                        ${ProductUI.state.attributes.map(attr => 
                            `<option value="${attr.attributeId}">${attr.attributeName}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Giá trị thuộc tính</label>
                    <textarea class="form-control attribute-values-input" 
                              rows="2"
                              placeholder="VD: Đỏ, Xanh, Vàng" 
                              disabled></textarea>
                    <small class="text-muted">Nhập các giá trị ngăn cách bởi dấu phẩy.</small>
                </div>
                <div class="col-md-1">
                    <button type="button" class="btn btn-danger btn-sm w-100 remove-attr-btn">Xóa</button>
                </div>
            </div>
        `;

        list.appendChild(row);

        const attrSelect = row.querySelector('.attribute-select');
        const valuesInput = row.querySelector('.attribute-values-input');

        attrSelect.addEventListener('change', (e) => {
            const selectedAttrId = e.target.value;
            
            if (selectedAttrId) {
                valuesInput.disabled = false;
                valuesInput.placeholder = 'VD: Đỏ, Xanh, Vàng';
            } else {
                valuesInput.disabled = true;
                valuesInput.value = '';
                valuesInput.placeholder = 'Vui lòng chọn thuộc tính trước';
            }
            
            ProductUI.updateSelectedAttributes();
        });

        valuesInput.addEventListener('input', () => {
            ProductUI.updateSelectedAttributes();
        });

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
                    const values = valuesString
                        .split(',')
                        .map(v => v.trim())
                        .filter(v => v.length > 0)
                        .map((name, index) => ({
                            id: `${attributeId}_${index}_${Date.now()}`,
                            attributeValueId: null,
                            name: name
                        }));

                    if (values.length > 0) {
                        selectedAttributes.push({
                            attributeId: attribute.attributeId,
                            attributeName: attribute.attributeName,
                            values: values
                        });
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

    renderVariantsTable: () => {
        const container = document.getElementById('variantsContainer');
        if (!container) return;

        if (ProductUI.state.variants.length === 0) {
            container.innerHTML = '<p class="text-muted">Chưa có biến thể nào. Thêm thuộc tính để tạo biến thể.</p>';
            return;
        }

        container.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Danh sách biến thể (${ProductUI.state.variants.length})</h5>
                    <div class="table-responsive">
                        <table class="table table-bordered">
                            <thead>
                                <tr>
                                    <th>Biến thể</th>
                                    <th>Ảnh</th>
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
                <td><strong>${variant.displayName}</strong></td>
                <td>
                    <input type="file" class="form-control form-control-sm variant-image" 
                           data-index="${index}" accept="image/*">
                    ${variant.imageName ? `<p class="text-muted mt-1 mb-0 small">Ảnh: ${variant.imageName}</p>` : ''}
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm variant-price-original" 
                           data-index="${index}" value="${variant.priceOriginal}" min="0" step="1000">
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm variant-price" 
                           data-index="${index}" value="${variant.price}" min="0" step="1000">
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm variant-stock" 
                           data-index="${index}" value="${variant.stock}" min="0">
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners
        document.querySelectorAll('.variant-price-original').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                ProductUI.state.variants[index].priceOriginal = parseFloat(e.target.value) || 0;
            });
        });

        document.querySelectorAll('.variant-price').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                ProductUI.state.variants[index].price = parseFloat(e.target.value) || 0;
            });
        });

        document.querySelectorAll('.variant-stock').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                ProductUI.state.variants[index].stock = parseInt(e.target.value) || 0;
            });
        });

        document.querySelectorAll('.variant-image').forEach(input => {
            input.addEventListener('change', async (e) => {
                const index = parseInt(e.target.dataset.index);
                const file = e.target.files[0];
                if (file) {
                    // Lưu file object và tên file
                    const fileName = file.name.replace(/\.[^/.]+$/, '');
                    ProductUI.state.variants[index].imageName = fileName;
                    ProductUI.state.variants[index].imageFile = file; // Lưu file thực tế
                    ProductUI.state.variants[index].imageUrl = null;
                    ProductUI.renderVariantsTable();
                }
            });
        });
    },

    handleMainImageUpload: (file) => {
        if (file) {
            // Lưu file object
            ProductUI.state.mainImageFile = file;
            const fileName = file.name.replace(/\.[^/.]+$/, '');
            
            // Preview ảnh
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('mainImagePreview');
                if (preview) {
                    preview.innerHTML = `
                        <img src="${e.target.result}" class="img-thumbnail" style="max-width: 200px;">
                        <p class="text-muted mt-2">Tên ảnh: <strong>${fileName}</strong></p>
                    `;
                }
            };
            reader.readAsDataURL(file);
        }
    },

    showNotification: (message, type = 'success') => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
        alertDiv.style.zIndex = '9999';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
};