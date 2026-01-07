export const PayloadBuilder = {
    // Tạo UUID v4
    uuidv4: () => {
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    },

    // Build ProductDTO & Images Map từ dữ liệu Form
    build: (baseInfo, variantsList) => {
        // baseInfo: { name, description, categoryId, brandId, originalPrice, price, id (optional) }
        // variantsList: Array of { id (opt), sku, priceImport, price, stock, imageFile (opt), attributes: [{name, value}] }

        const productDetailDTO = {
            productId: baseInfo.id || null, // Nếu null -> Backend tự tạo hoặc ignore
            productName: baseInfo.name,
            description: baseInfo.description,
            categoryId: baseInfo.categoryId,
            brandId: baseInfo.brandId,
            originalPrice: baseInfo.originalPrice.toString(),
            price: baseInfo.price.toString()
        };

        const attributes = [];
        const variants = [];
        const variantValues = [];
        const variantImagesMap = {}; // Key: variantId, Value: File

        // 1. Xử lý Attributes & Values (Group by Name)
        // Map: AttrName -> { id, name, values: { ValName -> id } }
        const attrMap = {};

        // Duyệt tất cả variants để thu thập attributes
        variantsList.forEach(v => {
            if (v.attributes) {
                v.attributes.forEach(attr => {
                    const aName = attr.name.trim();
                    const aVal = attr.value.trim();

                    if (!attrMap[aName]) {
                        attrMap[aName] = {
                            attributeId: PayloadBuilder.uuidv4(),
                            attributeName: aName,
                            values: {} // Map valueName -> valueId
                        };
                    }

                    if (!attrMap[aName].values[aVal]) {
                        attrMap[aName].values[aVal] = PayloadBuilder.uuidv4();
                    }
                });
            }
        });

        // Convert attrMap to List<AttributeDTO>
        Object.values(attrMap).forEach(a => {
            const attrValues = Object.entries(a.values).map(([valName, valId]) => ({
                attributeValueId: valId,
                attributeValueName: valName
            }));

            attributes.push({
                attributeId: a.attributeId,
                attributeName: a.attributeName,
                attributeValues: attrValues
            });
        });

        // 2. Xử lý Variants & VariantValues
        variantsList.forEach(v => {
            const variantId = v.id || PayloadBuilder.uuidv4();

            // VariantDTO
            variants.push({
                variantId: variantId,
                imageName: variantId, // Backend uses ID as image name often
                originalPrice: v.priceImport.toString(),
                price: v.price.toString(),
                stock: parseInt(v.quantity) || 0,
                sold: 0,
                active: true,
                sku: v.sku || ''
            });

            // Variant Images
            if (v.imageFile) {
                variantImagesMap[variantId] = v.imageFile;
            }

            // VariantValues (Link Variant -> AttributeValue)
            if (v.attributes) {
                v.attributes.forEach(attr => {
                    const aName = attr.name.trim();
                    const aVal = attr.value.trim();

                    if (attrMap[aName] && attrMap[aName].values[aVal]) {
                        variantValues.push({
                            variantId: variantId,
                            attributeValueId: attrMap[aName].values[aVal]
                        });
                    }
                });
            }
        });

        const productDTO = {
            productDetailDTO,
            attributes,
            variants,
            variantValues
        };

        return {
            productDTO,
            variantImagesMap
        };
    }
};
