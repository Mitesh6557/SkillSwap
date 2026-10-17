/**
 * SkillSwap - Review & Feedback Helpers
 */

const reviewsManager = {
  async submitReview({ swapId, revieweeId, rating, comment }) {
    return await api.post('/reviews', {
      swapId,
      revieweeId,
      rating,
      comment
    });
  },

  async getUserReviews(userId) {
    const res = await api.get(`/reviews/user/${userId}`);
    return res.data || [];
  }
};

window.reviewsManager = reviewsManager;
