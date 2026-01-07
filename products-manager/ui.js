import { formatCurrency } from './utils.js';

export const UI = {
    // === PRODUCT LIST ===
    renderProductList: (products, tableBodyId) => {
        const tbody = document.getElementById(tableBodyId);
        tbody.innerHTML = '';

        if (!products || products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-4 text-muted">
                        Không tìm thấy sản phẩm nào.
                    </td>
                </tr>`;
            return;
        }

        products.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-4">
                    <div class="d-flex align-items-center">
                        <div class="rounded bg-light d-flex align-items-center justify-content-center me-3" style="width: 48px; height: 48px; overflow: hidden;">
                            ${p.image ? `<img src="${p.image}" class="img-fluid" alt="${p.name}">` : '<i class="bi bi-box-seam text-secondary"></i>'}
                        </div>
                        <div>
                            <div class="fw-bold text-dark">${p.name}</div>
                            <small class="text-muted">ID: ${p.id}</small>
                        </div>
                    </div>
                </td>
                <td>${p.categoryName || '-'}</td>
                <td>${p.brandName || '-'}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-primary me-2 btn-edit-product" data-id="${p.id}">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-delete-product" data-id="${p.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderPagination: (currentPage, totalPages, paginationId, onPageChange) => {
        const ul = document.getElementById(paginationId);
        ul.innerHTML = '';

        if (totalPages <= 1) return;

        // Previous
        const liPrev = document.createElement('li');
        liPrev.className = `page-item ${currentPage === 0 ? 'disabled' : ''}`;
        liPrev.innerHTML = `<a class="page-link" href="#">Previous</a>`;
        liPrev.onclick = (e) => {
            e.preventDefault();
            if (currentPage > 0) onPageChange(currentPage - 1);
        };
        ul.appendChild(liPrev);

        // Pages
        for (let i = 0; i < totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#">${i + 1}</a>`;
            li.onclick = (e) => {
                e.preventDefault();
                onPageChange(i);
            };
            ul.appendChild(li);
        }

        // Next
        const liNext = document.createElement('li');
        liNext.className = `page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}`;
        liNext.innerHTML = `<a class="page-link" href="#">Next</a>`;
        liNext.onclick = (e) => {
            e.preventDefault();
            if (currentPage < totalPages - 1) onPageChange(currentPage + 1);
        };
        ul.appendChild(liNext);
    },

    // === FORM & TABS ===
    showListView: () => {
        document.getElementById('listView').classList.remove('d-none');
        document.getElementById('formView').classList.add('d-none');
        document.getElementById('btnViewList').classList.add('active');
        document.getElementById('btnViewAdd').classList.remove('active');
    },

    showFormView: (mode = 'ADD') => { // 'ADD' or 'EDIT'
        document.getElementById('listView').classList.add('d-none');
        document.getElementById('formView').classList.remove('d-none');

        // Reset Tabs to Info
        const infoTab = new bootstrap.Tab(document.querySelector('#info-tab'));
        infoTab.show();

        const title = document.getElementById('formTitle');
        const variantsTabBtn = document.getElementById('variants-tab');

        if (mode === 'ADD') {
            title.textContent = 'Thêm Sản Phẩm Mới';
            variantsTabBtn.disabled = true; // Cannot add variants until product is created
            document.getElementById('productId').value = '';
            document.getElementById('productForm').reset();
            document.getElementById('btnViewAdd').classList.add('active');
            document.getElementById('btnViewList').classList.remove('active');
        } else {
            title.textContent = 'Chỉnh Sửa Sản Phẩm';
            variantsTabBtn.disabled = false;
        }
    },

    fillProductForm: (product) => {
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('description').value = product.description || '';
        document.getElementById('categoryId').value = product.categoryId || '';
        document.getElementById('brandId').value = product.brandId || '';
        // Note: Images are handled separately if needed, or part of variants in this new flow
    },

    fillSelectOptions: (selectId, data, labelKey = 'name', valueKey = 'id') => {
        const select = document.getElementById(selectId);
        // Save default option
        const defaultOption = select.options[0];
        select.innerHTML = '';
        select.appendChild(defaultOption);

        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];
            option.textContent = item[labelKey];
            select.appendChild(option);
        });
    },

    // === VARIANTS ===
    renderVariantList: (variants, tableBodyId) => {
        const tbody = document.getElementById(tableBodyId);
        tbody.innerHTML = '';

        if (!variants || variants.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-muted">
                        Chưa có biến thể nào. Hãy thêm biến thể mới.
                    </td>
                </tr>`;
            return;
        }

        variants.forEach(v => {
            // Build attributes string (e.g., "Size: M, Color: Red")
            const attrStr = v.attributes
                ? v.attributes.map(a => `${a.name}: ${a.value}`).join(', ')
                : (v.sku || 'N/A');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                   <div class="rounded bg-light d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; overflow: hidden;">
                        ${v.image ? `<img src="${v.image}" class="img-fluid">` : '<i class="bi bi-image text-secondary"></i>'}
                    </div> 
                </td>
                <td>${attrStr}</td>
                <td>${formatCurrency(v.priceImport)}</td>
                <td>${formatCurrency(v.price)}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-2 btn-edit-variant" data-id="${v.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-delete-variant" data-id="${v.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    // Helper to generate attribute inputs in Modal
    renderAttributeInputs: (containerId, attributes = []) => {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        attributes.forEach((attr, index) => {
            const div = document.createElement('div');
            div.className = 'row mb-2 align-items-center';
            div.innerHTML = `
                <div class="col-5">
                    <input type="text" class="form-control form-control-sm" placeholder="Tên (VD: Size)" value="${attr.name || ''}" name="attrName[]">
                </div>
                <div class="col-5">
                    <input type="text" class="form-control form-control-sm" placeholder="Giá trị (VD: XL)" value="${attr.value || ''}" name="attrValue[]">
                </div>
                <div class="col-2 text-end">
                    <button type="button" class="btn btn-sm btn-outline-danger btn-remove-attr">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
            `;
            // Add event listener to remove button
            div.querySelector('.btn-remove-attr').onclick = () => div.remove();
            container.appendChild(div);
        });
    }
};
