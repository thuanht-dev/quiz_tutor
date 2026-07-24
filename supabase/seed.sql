-- Seed data for local/demo
-- NOTE: Auth users must be created via Supabase Auth / Admin API.
-- This seed inserts domain data assuming the following auth user IDs exist
-- (created by seed script or manually). For SQL-only demo of content tables,
-- we use fixed UUIDs documented in README.

-- Fixed UUIDs (document these for Auth user creation):
-- admin:    11111111-1111-1111-1111-111111111111  username: admin
-- student1: 22222222-2222-2222-2222-222222222221  username: minh
-- student2: 22222222-2222-2222-2222-222222222222  username: lan
-- student3: 22222222-2222-2222-2222-222222222223  username: tuan

-- Subjects
insert into public.subjects (id, name, color, icon, sort_order) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Toán', '#F97316', 'calculator', 1),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Tiếng Việt', '#22C55E', 'book-open', 2),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Tiếng Anh', '#0EA5E9', 'languages', 3)
on conflict (id) do nothing;

-- Quizzes
insert into public.quizzes (id, subject_id, title, description, time_limit_seconds, status) values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'Phép cộng lớp 2',
    'Luyện phép cộng trong phạm vi 100',
    600,
    'published'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'Từ đồng nghĩa',
    'Chọn từ đồng nghĩa phù hợp',
    null,
    'published'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'Animals vocabulary',
    'Nhận biết tên động vật bằng tiếng Anh',
    300,
    'draft'
  )
on conflict (id) do nothing;

-- Questions — Toán
insert into public.questions (id, subject_id, content, explanation, points) values
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   '15 + 7 = ?', '15 cộng 7 bằng 22.', 1),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   '20 + 30 = ?', '20 cộng 30 bằng 50.', 1),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   '8 + 9 = ?', '8 cộng 9 bằng 17.', 1),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   '12 + 18 = ?', '12 cộng 18 bằng 30.', 2),
  -- Tiếng Việt
  ('cccccccc-cccc-cccc-cccc-ccccccccccc5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
   'Từ nào đồng nghĩa với "vui vẻ"?', '"Vui vẻ" đồng nghĩa với "hạnh phúc".', 1),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc6', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
   'Từ nào đồng nghĩa với "nhanh"?', '"Nhanh" đồng nghĩa với "mau".', 1),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc7', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
   'Từ nào đồng nghĩa với "đẹp"?', '"Đẹp" đồng nghĩa với "xinh".', 1),
  -- Tiếng Anh
  ('cccccccc-cccc-cccc-cccc-ccccccccccc8', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
   'What is "con mèo" in English?', '"Con mèo" là "cat".', 1),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc9', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
   'What is "con chó" in English?', '"Con chó" là "dog".', 1)
on conflict (id) do nothing;

-- Options
insert into public.options (id, question_id, label, content, is_correct, sort_order) values
  -- Q1
  ('dddddddd-dddd-dddd-dddd-dddddddddd01', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', 'A', '21', false, 1),
  ('dddddddd-dddd-dddd-dddd-dddddddddd02', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', 'B', '22', true, 2),
  ('dddddddd-dddd-dddd-dddd-dddddddddd03', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', 'C', '23', false, 3),
  ('dddddddd-dddd-dddd-dddd-dddddddddd04', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', 'D', '24', false, 4),
  -- Q2
  ('dddddddd-dddd-dddd-dddd-dddddddddd05', 'cccccccc-cccc-cccc-cccc-ccccccccccc2', 'A', '40', false, 1),
  ('dddddddd-dddd-dddd-dddd-dddddddddd06', 'cccccccc-cccc-cccc-cccc-ccccccccccc2', 'B', '50', true, 2),
  ('dddddddd-dddd-dddd-dddd-dddddddddd07', 'cccccccc-cccc-cccc-cccc-ccccccccccc2', 'C', '60', false, 3),
  ('dddddddd-dddd-dddd-dddd-dddddddddd08', 'cccccccc-cccc-cccc-cccc-ccccccccccc2', 'D', '70', false, 4),
  -- Q3
  ('dddddddd-dddd-dddd-dddd-dddddddddd09', 'cccccccc-cccc-cccc-cccc-ccccccccccc3', 'A', '16', false, 1),
  ('dddddddd-dddd-dddd-dddd-dddddddddd10', 'cccccccc-cccc-cccc-cccc-ccccccccccc3', 'B', '17', true, 2),
  ('dddddddd-dddd-dddd-dddd-dddddddddd11', 'cccccccc-cccc-cccc-cccc-ccccccccccc3', 'C', '18', false, 3),
  ('dddddddd-dddd-dddd-dddd-dddddddddd12', 'cccccccc-cccc-cccc-cccc-ccccccccccc3', 'D', '19', false, 4),
  -- Q4
  ('dddddddd-dddd-dddd-dddd-dddddddddd13', 'cccccccc-cccc-cccc-cccc-ccccccccccc4', 'A', '28', false, 1),
  ('dddddddd-dddd-dddd-dddd-dddddddddd14', 'cccccccc-cccc-cccc-cccc-ccccccccccc4', 'B', '29', false, 2),
  ('dddddddd-dddd-dddd-dddd-dddddddddd15', 'cccccccc-cccc-cccc-cccc-ccccccccccc4', 'C', '30', true, 3),
  ('dddddddd-dddd-dddd-dddd-dddddddddd16', 'cccccccc-cccc-cccc-cccc-ccccccccccc4', 'D', '32', false, 4),
  -- Q5
  ('dddddddd-dddd-dddd-dddd-dddddddddd17', 'cccccccc-cccc-cccc-cccc-ccccccccccc5', 'A', 'Buồn bã', false, 1),
  ('dddddddd-dddd-dddd-dddd-dddddddddd18', 'cccccccc-cccc-cccc-cccc-ccccccccccc5', 'B', 'Hạnh phúc', true, 2),
  ('dddddddd-dddd-dddd-dddd-dddddddddd19', 'cccccccc-cccc-cccc-cccc-ccccccccccc5', 'C', 'Giận dữ', false, 3),
  ('dddddddd-dddd-dddd-dddd-dddddddddd20', 'cccccccc-cccc-cccc-cccc-ccccccccccc5', 'D', 'Mệt mỏi', false, 4),
  -- Q6
  ('dddddddd-dddd-dddd-dddd-dddddddddd21', 'cccccccc-cccc-cccc-cccc-ccccccccccc6', 'A', 'Chậm', false, 1),
  ('dddddddd-dddd-dddd-dddd-dddddddddd22', 'cccccccc-cccc-cccc-cccc-ccccccccccc6', 'B', 'Mau', true, 2),
  ('dddddddd-dddd-dddd-dddd-dddddddddd23', 'cccccccc-cccc-cccc-cccc-ccccccccccc6', 'C', 'Yếu', false, 3),
  ('dddddddd-dddd-dddd-dddd-dddddddddd24', 'cccccccc-cccc-cccc-cccc-ccccccccccc6', 'D', 'Xa', false, 4),
  -- Q7
  ('dddddddd-dddd-dddd-dddd-dddddddddd25', 'cccccccc-cccc-cccc-cccc-ccccccccccc7', 'A', 'Xấu', false, 1),
  ('dddddddd-dddd-dddd-dddd-dddddddddd26', 'cccccccc-cccc-cccc-cccc-ccccccccccc7', 'B', 'Xinh', true, 2),
  ('dddddddd-dddd-dddd-dddd-dddddddddd27', 'cccccccc-cccc-cccc-cccc-ccccccccccc7', 'C', 'To', false, 3),
  ('dddddddd-dddd-dddd-dddd-dddddddddd28', 'cccccccc-cccc-cccc-cccc-ccccccccccc7', 'D', 'Cao', false, 4),
  -- Q8
  ('dddddddd-dddd-dddd-dddd-dddddddddd29', 'cccccccc-cccc-cccc-cccc-ccccccccccc8', 'A', 'Dog', false, 1),
  ('dddddddd-dddd-dddd-dddd-dddddddddd30', 'cccccccc-cccc-cccc-cccc-ccccccccccc8', 'B', 'Cat', true, 2),
  ('dddddddd-dddd-dddd-dddd-dddddddddd31', 'cccccccc-cccc-cccc-cccc-ccccccccccc8', 'C', 'Bird', false, 3),
  ('dddddddd-dddd-dddd-dddd-dddddddddd32', 'cccccccc-cccc-cccc-cccc-ccccccccccc8', 'D', 'Fish', false, 4),
  -- Q9
  ('dddddddd-dddd-dddd-dddd-dddddddddd33', 'cccccccc-cccc-cccc-cccc-ccccccccccc9', 'A', 'Cat', false, 1),
  ('dddddddd-dddd-dddd-dddd-dddddddddd34', 'cccccccc-cccc-cccc-cccc-ccccccccccc9', 'B', 'Dog', true, 2),
  ('dddddddd-dddd-dddd-dddd-dddddddddd35', 'cccccccc-cccc-cccc-cccc-ccccccccccc9', 'C', 'Cow', false, 3),
  ('dddddddd-dddd-dddd-dddd-dddddddddd36', 'cccccccc-cccc-cccc-cccc-ccccccccccc9', 'D', 'Pig', false, 4)
on conflict (id) do nothing;

-- Link questions to quizzes
insert into public.quiz_questions (quiz_id, question_id, sort_order) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'cccccccc-cccc-cccc-cccc-ccccccccccc2', 2),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'cccccccc-cccc-cccc-cccc-ccccccccccc3', 3),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'cccccccc-cccc-cccc-cccc-ccccccccccc4', 4),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'cccccccc-cccc-cccc-cccc-ccccccccccc5', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'cccccccc-cccc-cccc-cccc-ccccccccccc6', 2),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'cccccccc-cccc-cccc-cccc-ccccccccccc7', 3),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'cccccccc-cccc-cccc-cccc-ccccccccccc8', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'cccccccc-cccc-cccc-cccc-ccccccccccc9', 2)
on conflict do nothing;
