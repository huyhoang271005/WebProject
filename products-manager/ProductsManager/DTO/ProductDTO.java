package org.example.Feature.ProductsManager.DTO;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.Feature.ProductsManager.DTO.VariantDTO;
import org.example.Feature.ProductsManager.DTO.VariantValueDTO;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductDTO {
    ProductDetailDTO productDetailDTO;
    List<AttributeDTO> attributes;
    List<VariantValueDTO> variantValues;
    List<VariantDTO> variants;
}