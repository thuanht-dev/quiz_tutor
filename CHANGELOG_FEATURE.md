# Tính năng: Thông báo Changelog (What's New)

## Mô tả
Hiển thị dialog thông báo tự động khi có tính năng mới, giúp user biết được các cải tiến trong phiên bản mới nhất.

## Cách hoạt động

### 1. Lưu trữ phiên bản đã xem
- Sử dụng `localStorage` với key `quiz_tutor_last_seen_version`
- Lưu version number của changelog cuối cùng user đã đóng

### 2. Logic hiển thị
- Kiểm tra khi component mount
- Nếu `lastSeenVersion !== latestVersion` → hiển thị dialog
- Delay 800ms để tránh xung đột với các dialog khác khi startup
- Khi user đóng dialog → lưu version hiện tại vào localStorage

### 3. Cập nhật changelog
Chỉnh sửa array `CHANGELOG` trong file `components/shared/changelog-dialog.tsx`:

```typescript
const CHANGELOG: ChangelogItem[] = [
  {
    version: "1.2.0",          // Version mới nhất
    date: "01/09/2026",         // Ngày release
    features: [
      "🎯 Tính năng mới 1",
      "✨ Cải tiến 2",
      "🔧 Sửa lỗi 3",
    ],
  },
  // Các version cũ hơn...
];
```

### 4. Best practices
- Đặt version mới nhất **ở đầu** array
- Dùng emoji để làm nổi bật (🔀 🔊 🎯 ✨ 🔧 🐛)
- Mỗi feature nên ngắn gọn, dễ hiểu
- Chỉ hiển thị version mới nhất (không show tất cả history)

## Files liên quan

### Components
- `components/shared/changelog-dialog.tsx` - Component chính
- `components/layout/student-shell.tsx` - Nơi render dialog

### Styling
- Sử dụng `framer-motion` cho animation mượt mà
- Gradient từ teal → emerald
- CheckCircle icon cho từng feature
- Kid-friendly design phù hợp với app

## UI/UX

### Khi nào hiển thị?
- Lần đầu user vào sau khi có version mới
- Chỉ hiển thị 1 lần cho mỗi version
- Không hiển thị lại nếu user đã đóng

### Tương tác
- Click nút "Tuyệt vời!" → đóng và lưu version
- Click overlay hoặc ESC → cũng đóng và lưu
- Animation fade-in/zoom cho mượt mà

## Testing

### Test cases
1. ✅ User mới (chưa có localStorage) → hiển thị dialog
2. ✅ User cũ với version cũ hơn → hiển thị dialog  
3. ✅ User đã xem version hiện tại → không hiển thị
4. ✅ User đóng dialog → lưu version vào localStorage
5. ✅ Refresh page sau khi đóng → không hiển thị lại

### Manual test
```javascript
// Clear localStorage để test lại
localStorage.removeItem('quiz_tutor_last_seen_version');

// Check version đã lưu
console.log(localStorage.getItem('quiz_tutor_last_seen_version'));
```

## Future enhancements
- [ ] Admin dashboard để quản lý changelog
- [ ] Lưu changelog vào database
- [ ] Nút "Xem lịch sử thay đổi" để xem các version cũ
- [ ] Phân loại theo loại change (Feature, Bugfix, Breaking change)
- [ ] Đa ngôn ngữ (VN/EN)
- [ ] Rich content: ảnh, video demo tính năng mới
