package org.example.Feature.Feedback;

import org.example.API.ApiCaller;
import org.example.API.ApiClient;
import org.example.API.ListResponse;
import org.example.API.MyResponse;
import org.example.Feature.Feedback.DTO.FeedbackCandidateDTO;
import org.example.Feature.Feedback.DTO.FeedbackRequestDTO;

import javax.swing.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class FeedbackController {
    private final FeedbackView view;
    private final FeedbackApi feedbackApi;
    private List<FeedbackCandidateDTO> currentProducts;

    public FeedbackController() {
        this.view = new FeedbackView();
        this.feedbackApi = ApiClient.getInstance().create(FeedbackApi.class);
        this.currentProducts = new ArrayList<>();

        initListeners();
        this.view.setVisible(true);
    }

    public FeedbackController(String orderId) {
        this(); // Gọi constructor mặc định
        setOrderId(orderId);
        if (orderId != null && !orderId.isEmpty()) {
            handleSearch();
        }
    }

    public FeedbackController(String userId, String orderId) {
        this(orderId);
    }

    private void initListeners() {
        view.addSearchListener(e -> handleSearch());
        view.addSubmitListener(e -> handleSubmitFeedback());
        view.addClearListener(e -> view.clearFeedbackForm());
    }

    public void setUserId(String userId) {
        // Deprecated: Backend tự lấy ID
        // Giữ lại hàm để không lỗi code cũ, nhưng không làm gì hoặc chỉ hiện lên view
        // cho vui
        if (view != null) {
            view.setUserId(userId);
        }
    }

    public void setOrderId(String orderId) {
        if (view != null) {
            view.setOrderId(orderId);
        }
    }

    // 1. xu ly tim kiem san pham theo order id
    private void handleSearch() {
        String orderIdStr = view.getOrderId();
        if (orderIdStr.isEmpty()) {
            view.showError("Vui lòng nhập Order ID!");
            return;
        }

        UUID orderId;
        try {
            orderId = UUID.fromString(orderIdStr);
        } catch (IllegalArgumentException e) {
            view.showError("Order ID không hợp lệ!");
            return;
        }

        view.setFormEnabled(false);
        // Gọi API lấy danh sách sản phẩm trong đơn hàng
        // Gọi API lấy danh sách sản phẩm trong đơn hàng
        ApiCaller.callApi(
                feedbackApi.getFeedbackCandidates(orderId),
                new ApiCaller.Listening<List<FeedbackCandidateDTO>>() {
                    @Override
                    public void onSuccess(MyResponse<List<FeedbackCandidateDTO>> res) {
                        SwingUtilities.invokeLater(() -> {
                            view.setFormEnabled(true);
                            if (res.getData() != null) {
                                currentProducts = res.getData();
                                view.setProducts(currentProducts);
                                view.showMessage("Tìm thấy " + currentProducts.size() + " sản phẩm có thể đánh giá!");
                            } else {
                                currentProducts = new ArrayList<>();
                                view.setProducts(currentProducts);
                                view.showMessage("Không có sản phẩm nào để đánh giá!");
                            }
                        });
                    }

                    @Override
                    public void onError(MyResponse<?> res) {
                        SwingUtilities.invokeLater(() -> {
                            view.setFormEnabled(true);
                            String errorMessage = res != null ? res.getMessage() : "Unknown";

                            // Kiểm tra nếu lỗi là do order chưa completed
                            if (errorMessage != null && errorMessage.contains("COMPLETED")) {
                                view.showError("""
                                        Không thể đánh giá!

                                        Lý do: Đơn hàng chưa ở trạng thái COMPLETED (Hoàn thành).

                                        Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã được hoàn thành.
                                        Vui lòng kiểm tra lại trạng thái đơn hàng của bạn.""");
                            } else {
                                view.showError("Lỗi tìm kiếm: " + errorMessage);
                            }

                            currentProducts = new ArrayList<>();
                            view.setProducts(currentProducts);
                        });
                    }
                });
    }

    // 2. xu ly gui danh gia
    private void handleSubmitFeedback() {
        // Validate selected product
        if (view.getSelectedProduct() == null || view.getSelectedOrderItemIds() == null
                || view.getSelectedOrderItemIds().isEmpty()) {
            view.showError("Vui lòng chọn sản phẩm để đánh giá!");
            return;
        }

        // Validate rating
        Integer rating = view.getRating();
        if (rating == null || rating < 1 || rating > 5) {
            view.showError("Đánh giá phải từ 1 đến 5 sao!");
            return;
        }

        // Validate comment
        String comment = view.getComment();
        if (comment.isEmpty()) {
            int confirm = JOptionPane.showConfirmDialog(
                    view,
                    "Bạn chưa nhập nhận xét. Bạn có muốn gửi đánh giá chỉ với số sao không?",
                    "Xác nhận",
                    JOptionPane.YES_NO_OPTION);
            if (confirm != JOptionPane.YES_OPTION) {
                return;
            }
        }

        // Build request
        FeedbackRequestDTO request = FeedbackRequestDTO.builder()
                .rating(rating)
                .comment(comment.isEmpty() ? null : comment)
                .orderItemIds(view.getSelectedOrderItemIds())
                .build();

        view.setFormEnabled(false);
        // Gọi API gửi feedback (Không cần userId nữa)
        ApiCaller.callApi(
                feedbackApi.submitFeedback(request),
                new ApiCaller.Listening<Void>() {
                    @Override
                    public void onSuccess(MyResponse<Void> res) {
                        SwingUtilities.invokeLater(() -> {
                            view.setFormEnabled(true);
                            view.showMessage("Gửi đánh giá thành công!");
                            view.clearFeedbackForm();
                        });
                    }

                    @Override
                    public void onError(MyResponse<?> res) {
                        SwingUtilities.invokeLater(() -> {
                            view.setFormEnabled(true);
                            view.showError("Lỗi gửi đánh giá: " + (res != null ? res.getMessage() : "Unknown"));
                        });
                    }
                });
    }
}
