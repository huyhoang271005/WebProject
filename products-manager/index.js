import { ProductService } from './service.js';
import { ProductLogic } from './logic.js';
import { ProductUI } from './ui.js';

// Initialize app
async function init() {
    try {
        // Load data
        console.log('Đang tải dữ liệu...');
        
        const [categories, brands, attributes] = await Promise.all([
            ProductService.getCategories(),
            ProductService.getBrands(),
            ProductService.getAttributes()
        ]);

        // Update state
        ProductUI.state.categories = categories;
        ProductUI.state.brands = brands;
        ProductUI.state.attributes = attributes;

        // Initialize UI
        ProductUI.initSearchableDropdown('categoryId', categories, 'categoryName', 'categoryId');
        ProductUI.initSearchableDropdown('brandId', brands, 'brandName', 'brandId');
        ProductUI.renderAttributeSelector();

        // Setup event listeners
        setupEventListeners();

        console.log('Khởi tạo thành công!');
    } catch (error) {
        console.error('Lỗi khởi tạo:', error);
        ProductUI.showNotification('Không thể tải dữ liệu. Vui lòng refresh trang.', 'danger');
    }
}

function setupEventListeners() {
    // Main image upload
    const mainImageInput = document.getElementById('mainImage');
    if (mainImageInput) {
        mainImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            ProductUI.handleMainImageUpload(file);
        });
    }

    // Form submit
    const form = document.getElementById('productForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn reset form?')) {
                form.reset();
                ProductUI.state.selectedAttributes = [];
                ProductUI.state.variants = [];
                ProductUI.state.mainImageName = null;
                document.getElementById('mainImagePreview').innerHTML = '';
                document.getElementById('selectedAttributesList').innerHTML = '';
                document.getElementById('variantsContainer').innerHTML = '';
            }
        });
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const spinner = document.getElementById('submitSpinner');
    
    try {
        // Show loading
        submitBtn.disabled = true;
        spinner.classList.remove('d-none');

        // Collect form data
        const formData = {
            productName: document.getElementById('productName').value.trim(),
            description: document.getElementById('description').value.trim(),
            imageName: ProductUI.state.mainImageName,
            priceOriginal: document.getElementById('priceOriginal').value,
            price: document.getElementById('price').value,
            categoryId: document.getElementById('categoryId').value || null,
            brandId: document.getElementById('brandId').value || null
        };

        // Validate
        const validation = ProductLogic.validateProduct({
            ...formData,
            variants: ProductUI.state.variants
        });

        if (!validation.isValid) {
            ProductUI.showNotification(validation.errors.join('<br>'), 'danger');
            return;
        }

        // Format data
        const productData = ProductLogic.formatProductData(
            formData,
            ProductUI.state.selectedAttributes,
            ProductUI.state.variants
        );

        console.log('Dữ liệu gửi đi:', productData);

        // Call API
        const response = await ProductService.createProduct(productData);

        if (response.success) {
            ProductUI.showNotification('Tạo sản phẩm thành công!', 'success');
            
            // Reset form sau 2 giây
            setTimeout(() => {
                document.getElementById('resetBtn').click();
            }, 2000);
        } else {
            ProductUI.showNotification(response.message || 'Có lỗi xảy ra', 'danger');
        }

    } catch (error) {
        console.error('Lỗi khi tạo sản phẩm:', error);
        ProductUI.showNotification('Lỗi kết nối server', 'danger');
    } finally {
        submitBtn.disabled = false;
        spinner.classList.add('d-none');
    }
}

// Start app
init();