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
            variantId: null, // sẽ được tạo bởi backend
            combination: combo,
            displayName: combo.map(c => c.valueName).join(' - '),
            imageName: null,
            imageUrl: null,
            priceOriginal: 0,
            price: 0,
            stock: 0,
            sold: 0,
            active: true
        }));
    },

    // Parse attribute values từ string (ngăn cách bởi dấu phẩy)
    parseAttributeValues: (inputString) => {
        if (!inputString || typeof inputString !== 'string') {
            return [];
        }
        
        return inputString
            .split(',')
            .map(v => v.trim())
            .filter(v => v.length > 0)
            .map((name, index) => ({
                id: `temp_${Date.now()}_${index}`,
                attributeValueId: null,
                name: name
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

    // Format dữ liệu để gửi lên server
    formatProductData: (formData, selectedAttributes, variants) => {
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

        // Format attributes
        const attributes = selectedAttributes.map(attr => ({
            attributeId: attr.attributeId,
            attributeName: attr.attributeName,
            attributeValues: attr.values.map(v => ({
                attributeValueId: v.attributeValueId || null,
                attributeValueName: v.name
            }))
        }));

        // Format variants
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

        // Format variantValues (mapping giữa attributeValue và variant)
        const variantValues = [];
        variants.forEach(variant => {
            variant.combination.forEach(combo => {
                variantValues.push({
                    attributeValueId: combo.valueId,
                    variantId: variant.variantId
                });
            });
        });

        return {
            productDetailDTO,
            attributes,
            variants: formattedVariants,
            variantValues
        };
    }
};