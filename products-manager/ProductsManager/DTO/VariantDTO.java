package org.example.Feature.ProductsManager.DTO;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VariantDTO {
    String variantId;
    String imageName;
    String originalPrice;
    String price;
    Integer stock;
    Integer sold;
    String imageUrl;
    Boolean active;
}