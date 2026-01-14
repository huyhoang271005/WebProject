package org.example.Feature.ProductsManager.DTO;

import lombok.*;
import lombok.experimental.FieldDefaults;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductDetailDTO {
    UUID productId;
    String productName;
    String description;
    String imageUrl;
    String originalPrice;
    String price;
    UUID categoryId;
    UUID brandId;
    Integer totalSales;
    Double ratingAvg;
    Integer ratingCount;
    String createdAt;
    String updatedAt;

}