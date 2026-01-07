// payloadBuilder.js
import { Utils } from "./utils.js";

export const PayloadBuilder = {
    buildProductPayload: (data) => {
        const {
            isEdit, currentId,
            productName, description, price, originalPrice,
            categoryId, brandId, currentMainImageUrl,
            attributes, variants, mainImageFile
        } = data;

        const payload = {
            productDetailDTO: {
                productId: isEdit ? currentId : null,
                productName: productName,
                description: description,
                price: String(price),
                originalPrice: String(originalPrice),
                categoryId: categoryId,
                brandId: brandId,
                imageUrl: currentMainImageUrl || ""
            },
            attributes: [],
            variants: [],
            variantValues: []
        };

        const attrValueIdMap = {};

        // 1. Process Attributes
        attributes.forEach(attr => {
            const attributeId = attr.id || Utils.generateUUID();
            attr.id = attributeId;

            const attrValues = attr.values.map(v => {
                const existingValueId = attr.valueIdMap[v];
                const valueId = existingValueId ? existingValueId : Utils.generateUUID();

                attrValueIdMap[`${attributeId}-${v}`] = valueId;

                return {
                    attributeValueId: valueId,
                    attributeValueName: v
                };
            });

            payload.attributes.push({
                attributeId: attributeId,
                attributeName: attr.name,
                attributeValues: attrValues
            });
        });

        // 2. Process Variants
        const formData = new FormData();

        variants.forEach(v => {
            const variantAttrValues = (v.comboValues || []).map((val, valIdx) => {
                const attr = attributes[valIdx];
                if (!attr) return null;
                const valueId = attrValueIdMap[`${attr.id}-${val}`];
                if (!valueId) return null;
                return {
                    variantId: v.id,
                    attributeValueId: valueId
                };
            }).filter(Boolean);

            payload.variants.push({
                variantId: v.id,
                price: String(v.price),
                originalPrice: String(v.priceOriginal),
                stock: v.stock,
                imageName: v.id,
                sold: 0,
                active: true
            });

            variantAttrValues.forEach(vv => payload.variantValues.push(vv));

            if (v.rawFile) {
                formData.append(v.id, v.rawFile);
            }
        });

        // Main Image
        if (mainImageFile) {
            formData.append("productImage", mainImageFile);
        }

        // ProductDTO
        formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

        return formData;
    }
};
