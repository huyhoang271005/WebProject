export const ProductLogic = {
    // Generate variants
    generateVariants: (selectedAttributes) => {
        if (!selectedAttributes || selectedAttributes.length === 0) return [];
        const validAttributes = selectedAttributes.filter(attr => attr.values && attr.values.length > 0);
        if (validAttributes.length === 0) return [];

        const combinations = validAttributes.reduce((acc, attribute) => {
            if (acc.length === 0) {
                return attribute.values.map(value => [{
                    attributeId: attribute.attributeId, attributeName: attribute.attributeName,
                    valueId: value.id, valueName: value.name
                }]);
            }
            const newCombinations = [];
            acc.forEach(combo => {
                attribute.values.forEach(value => {
                    newCombinations.push([...combo, {
                        attributeId: attribute.attributeId, attributeName: attribute.attributeName,
                        valueId: value.id, valueName: value.name
                    }]);
                });
            });
            return newCombinations;
        }, []);

        return combinations.map((combo, index) => ({
            id: `variant_gen_${Date.now()}_${index}`,
            variantId: null,
            combination: combo,
            displayName: combo.map(c => c.valueName).join(' - '),
            imageName: null, imageUrl: null, imageFile: null,
            priceOriginal: 0, price: 0, stock: 0, sold: 0, active: true
        }));
    },

    // Validate
    validateProduct: (productData) => {
        const errors = [];
        if (!productData.productName || productData.productName.trim() === '') errors.push('Tên sản phẩm không được để trống');
        if (!productData.price || productData.price <= 0) errors.push('Giá bán phải lớn hơn 0');
        if (!productData.priceOriginal || productData.priceOriginal <= 0) errors.push('Giá gốc phải lớn hơn 0');
        if (Number(productData.price) > Number(productData.priceOriginal)) errors.push('Giá bán không được lớn hơn giá gốc');
        
        // Bỏ qua check variants nếu không có attribute nào (SP đơn giản)
        // Nhưng nếu UI bắt buộc thì giữ lại. Ở đây mình check an toàn:
        if (productData.variants && productData.variants.length > 0) {
            productData.variants.forEach((variant, index) => {
                if (!variant.price || variant.price < 0) errors.push(`Biến thể ${index + 1}: Giá bán không hợp lệ`);
            });
        }
        return { isValid: errors.length === 0, errors: errors };
    },

    // [FIX] Format Data: Dùng String() để tránh lỗi crash khi id là null/undefined
    formatProductData: (formData, selectedAttributes, variants) => {
        const productDetailDTO = {
            productId: null,
            productName: formData.productName,
            description: formData.description || "",
            imageName: null, imageUrl: null,
            originalPrice: parseFloat(formData.priceOriginal), 
            price: parseFloat(formData.price),
            categoryId: formData.categoryId,
            brandId: formData.brandId,
            totalSales: 0, ratingAvg: 0.0, ratingCount: 0,
            createdAt: null, updatedAt: null
        };

        const attributes = selectedAttributes.map(attr => {
            if (!attr.values || attr.values.length === 0) return null;
            return {
                attributeId: attr.attributeId || null,
                attributeName: attr.attributeName,
                attributeValues: attr.values.map(v => ({
                    // FIX: Dùng String() để check an toàn
                    attributeValueId: (v.id && String(v.id).indexOf('_') === -1) ? v.id : null, 
                    attributeValueName: v.name
                }))
            };
        }).filter(a => a !== null);

        const formattedVariants = variants.map((variant, index) => {
            return {
                // FIX: Dùng String() để check an toàn
                variantId: (variant.variantId && String(variant.variantId).indexOf('variant_gen') === -1) ? variant.variantId : null,
                imageName: variant.imageName,
                imageUrl: null,
                originalPrice: parseFloat(variant.priceOriginal) || parseFloat(formData.priceOriginal),
                price: parseFloat(variant.price) || parseFloat(formData.price),
                stock: parseInt(variant.stock) || 0,
                sold: 0, active: true
            };
        });

        const variantValues = [];
        variants.forEach((variant, variantIndex) => {
            if (variant.combination && variant.combination.length > 0) {
                variant.combination.forEach(combo => {
                    variantValues.push({
                        variantId: variant.variantId || `variant_index_${variantIndex}`,
                        // FIX: Dùng String() để check an toàn
                        attributeValueId: (combo.valueId && String(combo.valueId).indexOf('_') === -1) ? combo.valueId : null
                    });
                });
            }
        });

        return { productDetailDTO, attributes, variants: formattedVariants, variantValues };
    }
};