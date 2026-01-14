package org.example.Feature.ProductsManager.DTO;

import lombok.*;
import lombok.experimental.FieldDefaults;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AttributeDTO {
    UUID attributeId;
    String attributeName;
    List<AttributeValueDTO> attributeValues;

    // --- THÊM ĐOẠN NÀY ---
    @Override
    public String toString() {
        return attributeName; // Để ComboBox hiển thị tên thuộc tính
    }
}