import { callAPI } from "/lib/api.js";

/**
 * Get feedback candidates (products) for an order
 * @param {string} orderId - UUID of the order
 * @returns {Promise} API response with list of FeedbackCandidateDTO
 */
export async function getFeedbackCandidates(orderId) {
    return await callAPI(`/feedbacks/candidates/${orderId}`, "GET");
}

/**
 * Submit feedback for order items
 * @param {Object} feedbackRequest - FeedbackRequestDTO
 * @param {number} feedbackRequest.rating - Rating 1-5
 * @param {string} feedbackRequest.comment - Optional comment
 * @param {Array<string>} feedbackRequest.orderItemIds - List of order item UUIDs
 * @returns {Promise} API response
 */
export async function submitFeedback(feedbackRequest) {
    return await callAPI("/feedbacks", "POST", feedbackRequest);
}
