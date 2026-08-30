-- Migration: Add shuffle_on_retry to quizzes
-- Khi làm bài lần 2+ (attempt_count > 0) thì đảo thứ tự câu hỏi và đáp án

ALTER TABLE quizzes
ADD COLUMN shuffle_on_retry boolean DEFAULT false;

COMMENT ON COLUMN quizzes.shuffle_on_retry IS 'Đảo câu hỏi và đáp án khi làm bài lại (lần 2+)';

-- Add shuffled_question_order and shuffled_option_orders to attempts
-- Lưu thứ tự đã shuffle để giữ nhất quán khi refresh
ALTER TABLE attempts
ADD COLUMN shuffled_question_order jsonb DEFAULT NULL,
ADD COLUMN shuffled_option_orders jsonb DEFAULT NULL;

COMMENT ON COLUMN attempts.shuffled_question_order IS 'Mảng question_id đã shuffle (nếu có). VD: ["q3","q1","q2"]';
COMMENT ON COLUMN attempts.shuffled_option_orders IS 'Map question_id -> mảng option_id đã shuffle. VD: {"q1":["o2","o4","o1","o3"]}';
