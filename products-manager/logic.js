export const ProductLogic = {
    // Tạo tất cả combinations của variants từ attributes
    generateVariants: (selectedAttributes) => {
        if (!selectedAttributes || selectedAttributes.length === 0) {
            return [];
        }

        // Lọc bỏ attributes không có values
        const validAttributes = selectedAttributes.filter(attr => 
            attr.values && attr.values.length > 0
        );

        if (validAttributes.length === 0) {
            return [];
        }

        // Tạo cartesian product
        const combinations = validAttributes.reduce((acc, attribute) => {
            if (acc.length === 0) {
                return attribute.values.map(value => [{
                    attributeId: attribute.attributeId,
                    attributeName: attribute.attributeName,
                    valueId: value.id,
                    valueName: value.name
                }]);
            }

            const newCombinations = [];
            acc.forEach(combo => {
                attribute.values.forEach(value => {
                    newCombinations.push([...combo, {
                        attributeId: attribute.attributeId,
                        attributeName: attribute.attributeName,
                        valueId: value.id,
                        valueName: value.name
                    }]);
                });
            });
            return newCombinations;
        }, []);

        // Chuyển đổi sang format variants
        return combinations.map((combo, index) => ({
            id: `variant_${Date.now()}_${index}`,
            variantId: null,
            combination: combo,
            displayName: combo.map(c => c.valueName).join(' - '),
            imageName: null,
            imageUrl: null,
            imageFile: null,
            priceOriginal: 0,
            price: 0,
            stock: 0,
            sold: 0,
            active: true
        }));
    },

    // Validate dữ liệu sản phẩm trước khi gửi
    validateProduct: (productData) => {
        const errors = [];

        if (!productData.productName || productData.productName.trim() === '') {
            errors.push('Tên sản phẩm không được để trống');
        }

        if (!productData.price || productData.price <= 0) {
            errors.push('Giá bán phải lớn hơn 0');
        }

        if (!productData.priceOriginal || productData.priceOriginal <= 0) {
            errors.push('Giá gốc phải lớn hơn 0');
        }

        if (productData.price > productData.priceOriginal) {
            errors.push('Giá bán không được lớn hơn giá gốc');
        }

        // Validate variants nếu có
        if (productData.variants && productData.variants.length > 0) {
            productData.variants.forEach((variant, index) => {
                if (!variant.price || variant.price <= 0) {
                    errors.push(`Biến thể ${index + 1}: Giá bán phải lớn hơn 0`);
                }
                if (!variant.priceOriginal || variant.priceOriginal <= 0) {
                    errors.push(`Biến thể ${index + 1}: Giá gốc phải lớn hơn 0`);
                }
                if (variant.price > variant.priceOriginal) {
                    errors.push(`Biến thể ${index + 1}: Giá bán không được lớn hơn giá gốc`);
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    // Format dữ liệu để gửi lên server (FormData)
    formatProductData: (formData, selectedAttributes, variants, mainImageFile) => {
        const formDataToSend = new FormData();

        // 1. Thêm productDetailDTO
        const productDetailDTO = {
            productId: null,
            productName: formData.productName,
            description: formData.description,
            imageUrl: null,
            priceOriginal: parseFloat(formData.priceOriginal),
            price: parseFloat(formData.price),
            categoryId: formData.categoryId,
            brandId: formData.brandId,
            totalSales: 0,
            ratingAvg: 0.0,
            ratingCount: 0,
            createdAt: null,
            updatedAt: null
        };
        formDataToSend.append('productDetailDTO', JSON.stringify(productDetailDTO));

        // 2. Thêm ảnh chính (nếu có)
        if (mainImageFile) {
            formDataToSend.append('mainImage', mainImageFile);
        }

        // 3. Thêm attributes
        const attributes = selectedAttributes.map(attr => ({
            attributeId: attr.attributeId,
            attributeName: attr.attributeName,
            attributeValues: attr.values.map(v => ({
                attributeValueId: v.attributeValueId || null,
                attributeValueName: v.name
            }))
        }));
        formDataToSend.append('attributes', JSON.stringify(attributes));

        // 4. Thêm variants
        const formattedVariants = variants.map(variant => ({
            variantId: variant.variantId,
            imageName: variant.imageName,
            priceOriginal: parseFloat(variant.priceOriginal),
            price: parseFloat(variant.price),
            stock: parseInt(variant.stock) || 0,
            sold: 0,
            imageUrl: variant.imageUrl,
            active: variant.active
        }));
        formDataToSend.append('variants', JSON.stringify(formattedVariants));

        // 5. Thêm ảnh của từng variant
        variants.forEach((variant, index) => {
            if (variant.imageFile) {
                formDataToSend.append(`variantImages`, variant.imageFile);
            }
        });

        // 6. Thêm variantValues (mapping giữa attributeValue và variant)
        const variantValues = [];
        variants.forEach(variant => {
            variant.combination.forEach(combo => {
                variantValues.push({
                    attributeValueId: combo.valueId,
                    variantId: variant.variantId
                });
            });
        });
        formDataToSend.append('variantValues', JSON.stringify(variantValues));

        return formDataToSend;
    }
};