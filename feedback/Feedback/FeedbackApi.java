package org.example.Feature.Feedback;

import org.example.API.ListResponse;
import org.example.API.MyResponse;
import org.example.Feature.Feedback.DTO.FeedbackCandidateDTO;
import org.example.Feature.Feedback.DTO.FeedbackRequestDTO;
import retrofit2.Call;
import retrofit2.http.*;

import java.util.List;
import java.util.UUID;

public interface FeedbackApi {
    @GET("/feedbacks/candidates/{orderId}")
    Call<MyResponse<List<FeedbackCandidateDTO>>> getFeedbackCandidates(@Path("orderId") UUID orderId);

    @POST("/feedbacks")
    Call<MyResponse<Void>> submitFeedback(
            @Body FeedbackRequestDTO feedbackRequest);
}
