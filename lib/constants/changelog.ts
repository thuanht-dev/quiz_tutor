export interface ChangelogItem {
  version: string;
  date: string;
  features: string[];
}

export const CHANGELOG: ChangelogItem[] = [
  {
    version: "1.1.0",
    date: "30/08/2026",
    features: [
      "🔀 Xáo trộn câu hỏi & đáp án khi làm lại bài (từ lần 2 trở đi)",
      "🔊 Âm thanh động khi chọn đáp án và hoàn thành bài",
      "🎯 Làm lại chỉ các câu sai sau một số lần chưa đạt",
      "✨ Cải thiện giao diện kết quả bài làm",
    ],
  },
  {
    version: "1.0.0",
    date: "01/08/2026",
    features: [
      "🎓 Ra mắt hệ thống trắc nghiệm cho học sinh tiểu học",
      "👨‍🏫 Quản lý bài thi, câu hỏi cho giáo viên",
      "📊 Theo dõi kết quả học sinh",
      "🎨 Giao diện thân thiện với trẻ em",
    ],
  },
];