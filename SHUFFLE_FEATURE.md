# Tính năng Shuffle (Đảo câu hỏi & đáp án)

## Tổng quan

Tính năng shuffle cho phép đảo ngẫu nhiên thứ tự câu hỏi và đáp án khi học sinh làm bài **từ lần thứ 2 trở đi** (không áp dụng cho lần đầu tiên).

## Cấu hình

Khi tạo/chỉnh sửa quiz, admin có thể bật/tắt tùy chọn:

**"Đảo câu hỏi & đáp án khi làm lại"** (mặc định: tắt)

- Từ lần làm bài thứ 2 trở đi, thứ tự câu hỏi và đáp án sẽ được đảo ngẫu nhiên
- Logic đáp án đúng vẫn được giữ nguyên (đảm bảo chấm điểm chính xác)
- Shuffle chỉ áp dụng cho **bài làm bình thường**, KHÔNG áp dụng cho chế độ "Làm lại câu sai"

## Cách hoạt động

### 1. Database Schema

**Bảng `quizzes`:**
- `shuffle_on_retry: boolean` - Cờ bật/tắt tính năng (mặc định `false`)

**Bảng `attempts`:**
- `shuffled_question_order: jsonb` - Mảng question_id đã shuffle
  - VD: `["q3","q1","q2","q4"]`
- `shuffled_option_orders: jsonb` - Map question_id → mảng option_id đã shuffle
  - VD: `{"q1":["o2","o4","o1","o3"], "q2":["o3","o1","o4","o2"]}`

### 2. Logic Shuffle

**Khi nào shuffle?**
```
if (quiz.shuffle_on_retry == true 
    && !is_retry_wrong 
    && completed_attempt_count > 0) {
  // Shuffle questions và options
}
```

**Điều kiện:**
1. Quiz phải bật `shuffle_on_retry`
2. Không phải chế độ "làm lại câu sai"
3. Guest đã hoàn thành ít nhất 1 lần (lần đầu giữ nguyên thứ tự)

**Algorithm:**
- Sử dụng Fisher-Yates shuffle
- Shuffle question order: đảo thứ tự câu hỏi trong quiz
- Shuffle option order: đảo thứ tự đáp án A-B-C-D của từng câu

### 3. Lưu trữ & Tái sử dụng

**Khi `startAttempt`:**
1. Kiểm tra điều kiện shuffle
2. Nếu thỏa mãn → random shuffle và lưu vào `attempt.shuffled_*`
3. Nếu không → `shuffled_* = null` (giữ thứ tự gốc)

**Khi refresh page:**
- Reuse attempt in_progress cũ
- Thứ tự câu hỏi & đáp án được giữ nguyên (đọc từ `shuffled_*`)

**Khi `submitAttempt`:**
- Chấm điểm dựa trên `is_correct` của từng option
- Không phụ thuộc vào thứ tự hiển thị

### 4. Flow Code

**Mock mode:**
```typescript
// lib/repositories/index.ts → startAttempt()
if (quiz.shuffle_on_retry && !is_retry_wrong) {
  const completedCount = await countCompletedAttempts(quizId, guestId);
  if (completedCount > 0) {
    // Shuffle questions
    const shuffledQuestions = shuffleArray(questions);
    shuffled_question_order = shuffledQuestions.map(q => q.id);
    
    // Shuffle options per question
    shuffled_option_orders = {};
    for (const q of questions) {
      shuffled_option_orders[q.id] = shuffleArray(q.options.map(o => o.id));
    }
  }
}
```

**Supabase mode:**
```sql
-- supabase/migrations/20260324000011_shuffle_start_attempt.sql
if v_quiz.shuffle_on_retry = true then
  select count(*) into v_completed_count
  from public.attempts
  where quiz_id = p_quiz_id
    and guest_id = p_guest_id
    and status in ('submitted', 'expired')
    and coalesce(is_retry_wrong, false) = false;

  if v_completed_count > 0 then
    -- Shuffle question order
    select jsonb_agg(qq.question_id order by random())
      into v_shuffled_q_order
    from public.quiz_questions qq
    where qq.quiz_id = p_quiz_id;

    -- Shuffle option orders
    select jsonb_object_agg(q.id, ...)
      into v_shuffled_opt_orders
    ...
  end if;
end if;
```

**Client-side (apply shuffle):**
```typescript
// lib/repositories/index.ts → beginPlayQuiz()
if (attempt.shuffled_question_order) {
  // Sort questions theo shuffled order
  questions = sortByOrder(questions, attempt.shuffled_question_order);
}

if (attempt.shuffled_option_orders) {
  // Sort options trong mỗi question
  questions = questions.map(q => ({
    ...q,
    options: sortByOrder(q.options, attempt.shuffled_option_orders[q.id])
  }));
}
```

## Migration

### Mock mode
Không cần migration, chỉ cần restart server.

### Supabase mode
Chạy 2 migrations mới:

1. **`20260324000010_shuffle_on_retry.sql`**
   - Thêm `shuffle_on_retry boolean` vào `quizzes`
   - Thêm `shuffled_question_order jsonb`, `shuffled_option_orders jsonb` vào `attempts`

2. **`20260324000011_shuffle_start_attempt.sql`**
   - Update RPC `start_attempt` để hỗ trợ logic shuffle

## Testing

### Test Case 1: Lần đầu làm bài (không shuffle)
1. Tạo quiz mới, bật "Đảo câu hỏi & đáp án khi làm lại"
2. Guest làm bài lần đầu
3. ✅ Thứ tự câu hỏi & đáp án giữ nguyên (theo quiz_questions.sort_order và options.sort_order)

### Test Case 2: Lần 2 làm bài (shuffle)
1. Guest nộp bài lần 1
2. Guest làm bài lần 2
3. ✅ Thứ tự câu hỏi & đáp án được đảo ngẫu nhiên
4. ✅ Refresh page → thứ tự vẫn giữ nguyên (không random lại)

### Test Case 3: Làm lại câu sai (không shuffle)
1. Guest làm bài fail đủ số lần cấu hình
2. Chọn "Làm lại câu sai"
3. ✅ Chỉ hiện câu sai, thứ tự KHÔNG shuffle (giữ nguyên)

### Test Case 4: Tắt shuffle_on_retry
1. Quiz không bật shuffle
2. Guest làm bài nhiều lần
3. ✅ Thứ tự luôn giữ nguyên

### Test Case 5: Chấm điểm chính xác
1. Làm bài với shuffle
2. Chọn đáp án đúng (dù đã đổi vị trí)
3. ✅ Vẫn được tính điểm đúng

## Lưu ý

- Shuffle chỉ tính lần làm bài **hoàn thành** (submitted/expired), không tính in_progress
- Mỗi attempt có shuffle order riêng (random mỗi lần)
- Admin xem bài làm vẫn thấy đúng thứ tự học sinh đã làm
- Không ảnh hưởng đến logic chấm điểm hay retry-wrong

## Files thay đổi

### Core Logic
- `lib/repositories/index.ts` - startAttempt, beginPlayQuiz, shuffle helpers
- `lib/repositories/mock-db.ts` - mock data với shuffled fields

### Types & Validation
- `types/database.ts` - Quiz, Attempt interfaces
- `lib/validations/schemas.ts` - quizSchema + shuffle_on_retry
- `lib/mock/data.ts` - mock quizzes/attempts với shuffled fields

### UI
- `features/admin/quizzes/quiz-form.tsx` - Form toggle shuffle_on_retry

### Database
- `supabase/migrations/20260324000010_shuffle_on_retry.sql` - Schema
- `supabase/migrations/20260324000011_shuffle_start_attempt.sql` - RPC update
- `README.md` - Thêm 2 migrations mới

## Tổng kết

Tính năng này giúp ngăn học sinh ghi nhớ vị trí đáp án, thay vì hiểu nội dung. Đặc biệt hữu ích khi học sinh làm bài nhiều lần để cải thiện điểm số.
