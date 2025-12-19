export const ProductLogic = {
    // Generate all variant combinations from attributes
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
            variantId: null, // Mới tạo thì null
            combination: combo,
            displayName: combo.map(c => c.valueName).join(' - '),
            imageName: null, imageUrl: null, imageFile: null,
            priceOriginal: 0, price: 0, stock: 0, sold: 0, active: true
        }));
    },

    // Validate product data before submission
    validateProduct: (productData) => {
        const errors = [];
        if (!productData.productName || productData.productName.trim() === '') errors.push('Tên sản phẩm không được để trống');
        if (!productData.price || productData.price <= 0) errors.push('Giá bán phải lớn hơn 0');
        if (!productData.priceOriginal || productData.priceOriginal <= 0) errors.push('Giá gốc phải lớn hơn 0');
        if (productData.price > productData.priceOriginal) errors.push('Giá bán không được lớn hơn giá gốc');
        
        if (productData.variants && productData.variants.length > 0) {
            productData.variants.forEach((variant, index) => {
                if (!variant.price || variant.price <= 0) errors.push(`Biến thể ${index + 1}: Giá bán phải lớn hơn 0`);
                if (!variant.priceOriginal || variant.priceOriginal <= 0) errors.push(`Biến thể ${index + 1}: Giá gốc phải lớn hơn 0`);
            });
        }
        return { isValid: errors.length === 0, errors: errors };
    },

    // [QUAN TRỌNG] Format Data: Giữ lại ID thật khi sửa
    formatProductData: (formData, selectedAttributes, variants) => {
        const productDetailDTO = {
            productId: null, // Sẽ được gán ở index.js nếu là edit
            productName: formData.productName,
            description: formData.description || "",
            imageName: null, 
            imageUrl: null,
            originalPrice: parseFloat(formData.priceOriginal), 
            price: parseFloat(formData.price),
            categoryId: formData.categoryId,
            brandId: formData.brandId,
            totalSales: 0, ratingAvg: 0.0, ratingCount: 0,
            createdAt: null, updatedAt: null
        };

        // Attributes
        const attributes = selectedAttributes.map(attr => {
            if (!attr.values || attr.values.length === 0) return null;
            return {
                attributeId: attr.attributeId || null,
                attributeName: attr.attributeName,
                attributeValues: attr.values.map(v => ({
                    // Nếu ID có dấu _ hoặc gạch ngang dài (id tạm) thì set null để backend tạo mới
                    attributeValueId: (v.id && !v.id.toString().includes('_')) ? v.id : null, 
                    attributeValueName: v.name
                }))
            };
        }).filter(a => a !== null);

        // Variants
        const formattedVariants = variants.map((variant, index) => {
            return {
                // Giữ nguyên variantId nếu có (để update), nếu không thì null (để tạo mới)
                variantId: (variant.variantId && !variant.variantId.toString().startsWith('variant_gen')) ? variant.variantId : null,
                imageName: variant.imageName,
                imageUrl: null,
                originalPrice: parseFloat(variant.priceOriginal) || parseFloat(formData.priceOriginal),
                price: parseFloat(variant.price) || parseFloat(formData.price),
                stock: parseInt(variant.stock) || 0,
                sold: 0, active: true
            };
        });

        // Variant Values
        const variantValues = [];
        variants.forEach((variant, variantIndex) => {
            if (variant.combination && variant.combination.length > 0) {
                variant.combination.forEach(combo => {
                    variantValues.push({
                        // Map theo index hoặc ID
                        variantId: variant.variantId || `variant_index_${variantIndex}`,
                        attributeValueId: (combo.valueId && !combo.valueId.toString().includes('_')) ? combo.valueId : null
                    });
                });
            }
        });

        return { productDetailDTO, attributes, variants: formattedVariants, variantValues };
    }
};