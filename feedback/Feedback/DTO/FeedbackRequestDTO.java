package org.example.Feature.Feedback.DTO;

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
public class FeedbackRequestDTO {
    Integer rating;
    String comment;
    List<UUID> orderItemIds;
}
