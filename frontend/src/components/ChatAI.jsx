import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User as UserIcon,
  Sparkles,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import api from "../utils/api";

const ChatAI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
         type: "ai",
         content:
           "Chào bạn! 😊 Mình là trợ lý học tập của DNU Social. Mình ở đây để hỗ trợ bạn trong việc học tập và sử dụng hệ thống. Bạn cần mình giúp gì hôm nay? 💪",
         timestamp: new Date(),
       },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuthStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponse = (userMessage) => {
    const messageLower = userMessage.toLowerCase();

    // Câu hỏi về hệ thống
    if (
      messageLower.includes("hệ thống") ||
      messageLower.includes("là gì") ||
      messageLower.includes("giới thiệu") ||
      messageLower.includes("dnu social")
    ) {
      return "DNU Social là mạng xã hội học tập chính thức của Đại học Đồng Nai. Hệ thống giúp sinh viên và giảng viên:\n\n📚 Chia sẻ tài liệu học tập\n💬 Thảo luận và trao đổi thông tin\n👥 Tham gia nhóm học tập\n📅 Đăng ký và tạo sự kiện học thuật\n💌 Chat trực tiếp với nhau\n\nBạn muốn tìm hiểu thêm về tính năng nào? 😊";
    }

    // 📝 CHỦ ĐỀ 1: ĐĂNG BÀI VIẾT & TÀI LIỆU
    if (
      messageLower.includes("chia sẻ tài liệu") ||
      messageLower.includes("mục nào") ||
      messageLower.includes("tài liệu học tập")
    ) {
      return 'Để chia sẻ tài liệu học tập:\n\n1️⃣ Chọn danh mục "Tài liệu" khi đăng bài\n2️⃣ Hoặc vào tab "Tài liệu" trên trang chủ để xem tài liệu có sẵn\n3️⃣ Có thể đính kèm file (PDF, DOC, DOCX, XLS, PPT) khi đăng bài\n\n📎 Định dạng hỗ trợ: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX\n📏 Kích thước: Tối đa 5MB mỗi file, tối đa 10 file mỗi bài viết\n\nBạn muốn chia sẻ tài liệu gì?';
    }

    if (
      messageLower.includes("đăng bài có kèm hình ảnh") ||
      messageLower.includes("kèm ảnh") ||
      messageLower.includes("đính kèm ảnh")
    ) {
      return "Để đăng bài có kèm hình ảnh:\n\n1️⃣ Khi đăng bài, nhấn icon hình ảnh hoặc kéo thả ảnh vào\n2️⃣ Tối đa 10 ảnh, mỗi ảnh ≤ 5MB\n3️⃣ Định dạng: JPG, PNG, GIF\n4️⃣ Có thể xem trước và xóa ảnh trước khi đăng\n\n💡 Mẹo: Bạn có thể chọn nhiều ảnh cùng lúc bằng Ctrl+Click (Windows) hoặc Cmd+Click (Mac)\n\nBạn gặp vấn đề gì khi đăng ảnh không?";
    }

    if (
      messageLower.includes("file pdf") ||
      messageLower.includes("file word") ||
      messageLower.includes("tải lên file")
    ) {
      return 'Có, bạn có thể tải lên file PDF hoặc Word:\n\n✅ Định dạng hỗ trợ:\n   • PDF (.pdf)\n   • Word (.doc, .docx)\n   • Excel (.xls, .xlsx)\n   • PowerPoint (.ppt, .pptx)\n\n📏 Giới hạn:\n   • Tối đa 10 file mỗi bài viết\n   • Mỗi file tối đa 5MB\n\n📝 Cách đăng:\n   1. Khi đăng bài, nhấn icon đính kèm file\n   2. Chọn file từ máy tính\n   3. Đợi upload xong\n   4. Nhấn "Đăng bài"\n\nBạn cần hỗ trợ gì thêm?';
    }

    if (
      messageLower.includes("kích thước file") ||
      messageLower.includes("file tối đa") ||
      messageLower.includes("dung lượng")
    ) {
      return "Kích thước file tối đa:\n\n📏 Mỗi file/ảnh: Tối đa 5MB\n📊 Số lượng: Tối đa 10 ảnh hoặc 10 file mỗi bài viết\n\n💡 Nếu file quá lớn:\n   • Nén file trước khi upload\n   • Chia nhỏ file thành nhiều phần\n   • Sử dụng công cụ nén online\n\nBạn có file cần upload không?";
    }

    if (
      messageLower.includes("chèn video") ||
      messageLower.includes("video vào bài") ||
      messageLower.includes("upload video")
    ) {
      return "Hiện tại hệ thống chưa hỗ trợ upload video trực tiếp. Bạn có thể:\n\n1️⃣ Dán link YouTube/Vimeo vào nội dung bài viết\n2️⃣ Hoặc đính kèm file video (nếu hỗ trợ)\n\n💡 Mẹo: Bạn có thể upload video lên YouTube trước, sau đó chia sẻ link trong bài viết.\n\nBạn muốn chia sẻ video về chủ đề gì?";
    }

    if (
      messageLower.includes("gắn thẻ") ||
      messageLower.includes("tag môn học") ||
      messageLower.includes("hashtag")
    ) {
      return "Để gắn thẻ (tag) môn học vào bài viết:\n\n1️⃣ Khi đăng bài, nhập hashtag với dấu #\n   Ví dụ: #CNTT, #Toán, #TiếngAnh\n2️⃣ Hoặc chọn từ danh sách hashtag gợi ý\n3️⃣ Hashtag giúp người khác dễ tìm bài viết của bạn\n\n💡 Mẹo: Sử dụng hashtag phổ biến để bài viết được nhiều người thấy hơn.\n\nBạn muốn tag môn học nào?";
    }

    if (
      messageLower.includes("không thấy nút đăng bài") ||
      messageLower.includes("nút đăng bài ở đâu")
    ) {
      return 'Nếu không thấy nút đăng bài:\n\n1️⃣ Kiểm tra bạn đã đăng nhập chưa\n2️⃣ Nút ở trang chủ: "Bạn đang nghĩ gì?" hoặc icon "+"\n3️⃣ Nếu vẫn không thấy, thử:\n   • Làm mới trang (F5)\n   • Xóa cache trình duyệt\n   • Đăng nhập lại\n   • Liên hệ Admin\n\nBạn đang ở trang nào? Tôi có thể hướng dẫn cụ thể hơn!';
    }

    if (
      messageLower.includes("sửa lại bài viết") ||
      messageLower.includes("chỉnh sửa bài") ||
      messageLower.includes("sửa lỗi chính tả")
    ) {
      return 'Để sửa lại bài viết:\n\n1️⃣ Nhấn nút "..." trên bài viết của bạn\n2️⃣ Chọn "Chỉnh sửa bài viết"\n3️⃣ Sửa nội dung và nhấn "Lưu"\n\n⚠️ Lưu ý:\n   • Chỉ có thể sửa bài viết của chính bạn\n   • Bài viết đã được duyệt vẫn có thể sửa\n   • Thay đổi sẽ được cập nhật ngay\n\nBạn cần sửa bài viết nào?';
    }

    if (
      messageLower.includes("xóa bài viết cũ") ||
      messageLower.includes("xóa bài viết")
    ) {
      return 'Để xóa bài viết:\n\n1️⃣ Nhấn nút "..." trên bài viết\n2️⃣ Chọn "Xóa bài viết"\n3️⃣ Xác nhận xóa\n\n⚠️ Lưu ý:\n   • Không thể khôi phục sau khi xóa\n   • Chỉ có thể xóa bài viết của chính bạn\n   • Hãy cẩn thận khi xóa\n\nBạn chắc chắn muốn xóa không?';
    }

    if (
      messageLower.includes("chờ duyệt") ||
      messageLower.includes("duyệt bài") ||
      messageLower.includes("bài viết hiện lên")
    ) {
      return "Về việc duyệt bài viết:\n\n✅ Có, tất cả bài viết cần Admin duyệt\n⏰ Thời gian duyệt: Thường trong vòng 24h\n📧 Bạn sẽ nhận thông báo khi:\n   • Bài viết được duyệt → Hiển thị công khai\n   • Bài viết bị từ chối → Có lý do cụ thể\n\n💡 Mẹo: Viết nội dung rõ ràng, phù hợp để được duyệt nhanh hơn.\n\nBạn đang chờ duyệt bài viết nào?";
    }

    if (
      messageLower.includes("bị báo vi phạm") ||
      messageLower.includes("vi phạm quy định")
    ) {
      return "Nếu bài viết bị báo vi phạm quy định:\n\n🔍 Có thể do:\n   • Nội dung không phù hợp\n   • Spam hoặc quảng cáo\n   • Vi phạm bản quyền\n   • Nội dung nhạy cảm\n\n📧 Admin sẽ xem xét và thông báo lý do cụ thể\n💬 Bạn có thể liên hệ Admin để được giải thích\n\nBạn có câu hỏi gì về quy định không?";
    }

    if (
      messageLower.includes("đăng bài ẩn danh") ||
      messageLower.includes("ẩn danh")
    ) {
      return "Rất tiếc, hiện tại hệ thống không hỗ trợ đăng bài ẩn danh.\n\n❌ Tất cả bài viết đều hiển thị tên người đăng\n✅ Đây là quy định để đảm bảo trách nhiệm nội dung\n\n💡 Nếu bạn muốn chia sẻ ý kiến riêng tư, có thể:\n   • Chat trực tiếp với người bạn muốn chia sẻ\n   • Tạo nhóm riêng tư\n\nBạn có lý do đặc biệt cần ẩn danh không?";
    }

    if (
      messageLower.includes("lưu bài viết vào mục nháp") ||
      messageLower.includes("mục nháp") ||
      messageLower.includes("đăng sau")
    ) {
      return "Hiện tại hệ thống chưa có tính năng nháp.\n\n💡 Bạn có thể:\n   • Viết nội dung ở nơi khác (Word, Notepad)\n   • Copy vào khi đăng\n   • Hoặc đề xuất Admin phát triển tính năng này\n\n📝 Tính năng nháp sẽ giúp:\n   • Lưu bài viết chưa hoàn thành\n   • Chỉnh sửa và đăng sau\n   • Quản lý bài viết tốt hơn\n\nBạn muốn đề xuất tính năng này không?";
    }

    if (
      messageLower.includes("ghim bài viết") ||
      messageLower.includes("ghim lên đầu")
    ) {
      return 'Để ghim bài viết quan trọng:\n\n1️⃣ Vào trang cá nhân của bạn\n2️⃣ Nhấn nút "..." trên bài viết muốn ghim\n3️⃣ Chọn "Ghim bài viết" (nếu có tính năng này)\n\n💡 Nếu không thấy tùy chọn:\n   • Tính năng có thể chưa được kích hoạt\n   • Hoặc liên hệ Admin để được hỗ trợ\n\nBạn muốn ghim bài viết nào?';
    }

    if (
      messageLower.includes("tắt tính năng bình luận") ||
      messageLower.includes("tắt bình luận")
    ) {
      return "Hiện tại chưa có tính năng tắt bình luận.\n\n💡 Bạn có thể:\n   • Xóa các bình luận không mong muốn\n   • Báo cáo bình luận spam/không phù hợp\n   • Chặn người dùng gây phiền toái\n\n📝 Tính năng này sẽ giúp:\n   • Kiểm soát tương tác trên bài viết\n   • Tránh spam và bình luận không mong muốn\n\nBạn muốn đề xuất tính năng này không?";
    }

    if (
      messageLower.includes("chia sẻ sang facebook") ||
      messageLower.includes("chia sẻ sang zalo") ||
      messageLower.includes("chia sẻ bài viết")
    ) {
      return 'Để chia sẻ bài viết sang Facebook/Zalo:\n\n1️⃣ Nhấn nút "Chia sẻ" trên bài viết\n2️⃣ Chọn "Sao chép link"\n3️⃣ Dán link vào Facebook/Zalo\n\n💡 Hoặc:\n   • Chụp màn hình bài viết\n   • Đăng lên mạng xã hội khác\n\n📱 Lưu ý: Link chỉ hoạt động khi người xem đã đăng nhập vào hệ thống.\n\nBạn muốn chia sẻ bài viết nào?';
    }

    if (
      messageLower.includes("định dạng chữ") ||
      messageLower.includes("in đậm") ||
      messageLower.includes("in nghiêng")
    ) {
      return "Về định dạng chữ trong bài viết:\n\n⚠️ Hiện tại hệ thống chưa hỗ trợ định dạng rich text đầy đủ\n\n💡 Bạn có thể thử:\n   • **text** cho in đậm (nếu hỗ trợ Markdown)\n   • *text* cho in nghiêng (nếu hỗ trợ Markdown)\n   • Viết bằng chữ thường\n\n📝 Tính năng định dạng sẽ giúp:\n   • Làm nổi bật nội dung quan trọng\n   • Trình bày đẹp hơn\n\nBạn muốn đề xuất tính năng này không?";
    }

    if (
      messageLower.includes("xóa nhầm bài viết") ||
      messageLower.includes("khôi phục bài viết")
    ) {
      return "Rất tiếc, không thể khôi phục bài viết sau khi xóa.\n\n❌ Hệ thống không có tính năng khôi phục\n\n💡 Bạn có thể:\n   • Đăng lại bài viết mới với nội dung tương tự\n   • Nếu có backup, copy lại nội dung\n\n⚠️ Lưu ý: Hãy cẩn thận khi xóa bài viết. Nếu không chắc, hãy ẩn bài viết thay vì xóa.\n\nBạn có cần hỗ trợ gì khác không?";
    }

    // Câu hỏi về đăng bài
    if (
      messageLower.includes("đăng bài") ||
      messageLower.includes("tạo bài") ||
      messageLower.includes("post") ||
      messageLower.includes("viết bài")
    ) {
      return 'Để đăng bài viết:\n\n1️⃣ Vào trang chủ, nhấn nút "Bạn đang nghĩ gì?" hoặc nút "+"\n2️⃣ Chọn danh mục: Học tập, Tài liệu, Thảo luận, Sự kiện, Khác\n3️⃣ Nhập nội dung bài viết\n4️⃣ Có thể đính kèm hình ảnh (tối đa 10 ảnh, mỗi ảnh ≤ 5MB)\n5️⃣ Thêm hashtag nếu muốn\n6️⃣ Nhấn "Đăng bài"\n\n⚠️ Lưu ý: Bài viết cần được Admin duyệt trước khi hiển thị công khai (thường trong vòng 24h).\n\nBạn có cần hướng dẫn chi tiết hơn không?';
    }

    // Câu hỏi về tài liệu
    if (
      messageLower.includes("tài liệu") ||
      messageLower.includes("document") ||
      messageLower.includes("file") ||
      messageLower.includes("download")
    ) {
      return 'Phần "Tài liệu" cho phép bạn:\n\n📖 Xem tài liệu học tập theo chuyên ngành\n⬇️ Tải xuống file đính kèm\n🔖 Lưu tài liệu quan trọng bằng nút bookmark\n💬 Bình luận và thảo luận về tài liệu\n\nĐể xem tài liệu: Vào tab "Tài liệu" trên trang chủ, chọn chuyên ngành của bạn.\n\nBạn muốn tìm tài liệu về chủ đề gì?';
    }

    // Câu hỏi về nhóm
    if (
      messageLower.includes("nhóm") ||
      messageLower.includes("group") ||
      messageLower.includes("tham gia nhóm") ||
      messageLower.includes("tạo nhóm")
    ) {
      return 'Tính năng Nhóm học tập:\n\n👥 Tham gia các nhóm học tập theo môn học/chuyên ngành\n📝 Đăng bài và thảo luận trong nhóm\n📚 Chia sẻ tài liệu với thành viên\n➕ Tạo nhóm mới (chỉ Giảng viên và Admin)\n\nCách tham gia:\n1. Vào tab "Nhóm học tập"\n2. Chọn "Khám phá" để tìm nhóm\n3. Nhấn "Tham gia" vào nhóm bạn muốn\n\nCách tạo nhóm:\n1. Nhấn "Tạo nhóm"\n2. Điền tên, mô tả\n3. Chọn quyền truy cập (Công khai/Riêng tư)\n\nBạn cần hỗ trợ gì về nhóm?';
    }

    // Câu hỏi về sự kiện
    if (
      messageLower.includes("sự kiện") ||
      messageLower.includes("event") ||
      messageLower.includes("đăng ký sự kiện") ||
      messageLower.includes("tạo sự kiện")
    ) {
      return 'Phần Sự kiện:\n\n📅 Xem các hoạt động: Hội thảo, Seminar, Workshop, Hackathon, Thi đấu\n🎯 Lọc theo: Sắp diễn ra, Đang diễn ra, Đã kết thúc\n🏷️ Lọc theo danh mục: Học thuật, Thi đấu, Workshop, Hackathon, Seminar\n\nCách đăng ký:\n1. Vào trang "Sự kiện"\n2. Chọn sự kiện bạn muốn\n3. Nhấn "Đăng ký quan tâm" hoặc "Tham gia sự kiện"\n\nCách tạo sự kiện (chỉ Giảng viên/Admin):\n1. Nhấn "+ Tạo sự kiện"\n2. Điền đầy đủ: Tiêu đề, mô tả, thời gian, địa điểm, số lượng người tham gia\n\nBạn muốn tìm sự kiện nào?';
    }

    // Câu hỏi về thông báo
    if (
      messageLower.includes("thông báo") ||
      messageLower.includes("notification") ||
      messageLower.includes("chuông") ||
      messageLower.includes("thông báo chưa đọc")
    ) {
      return "Bạn sẽ nhận thông báo khi:\n\n🔔 Có người bình luận bài viết của bạn\n💬 Ai đó trả lời bình luận của bạn\n👍 Có người thích bài viết của bạn\n✅ Bài viết được duyệt/từ chối\n📅 Có sự kiện mới trong nhóm bạn tham gia\n👥 Có thành viên mới tham gia nhóm của bạn\n\nXem thông báo: Nhấn icon chuông ở header (số đỏ hiển thị số thông báo chưa đọc).\n\nBạn có thể đánh dấu đã đọc hoặc xóa thông báo.";
    }

    // Câu hỏi về tìm kiếm
    if (
      messageLower.includes("tìm kiếm") ||
      messageLower.includes("search") ||
      messageLower.includes("tìm") ||
      messageLower.includes("tìm người") ||
      messageLower.includes("tìm bài")
    ) {
      return "Tìm kiếm trong hệ thống:\n\n🔍 Sử dụng thanh tìm kiếm ở header\n📝 Tìm bài viết: Theo tiêu đề, nội dung, hashtag\n👤 Tìm người dùng: Theo tên, email\n👥 Tìm nhóm: Theo tên nhóm\n📅 Tìm sự kiện: Theo tên sự kiện\n\nKết quả hiển thị ngay khi bạn nhập. Bạn có thể lọc kết quả theo loại.\n\nBạn đang tìm gì? Tôi có thể hướng dẫn cụ thể hơn!";
    }

    // Câu hỏi về báo cáo
    if (
      messageLower.includes("báo cáo") ||
      messageLower.includes("report") ||
      messageLower.includes("tố cáo") ||
      messageLower.includes("spam")
    ) {
      return 'Báo cáo nội dung không phù hợp:\n\n1️⃣ Nhấn nút "..." trên bài viết\n2️⃣ Chọn "Báo cáo bài viết"\n3️⃣ Chọn lý do:\n   • Spam\n   • Nội dung không phù hợp\n   • Quấy rối\n   • Vi phạm bản quyền\n   • Khác\n4️⃣ Mô tả chi tiết (nếu có)\n5️⃣ Gửi báo cáo\n\n✅ Admin sẽ xem xét và xử lý trong thời gian sớm nhất.\n\nCảm ơn bạn đã giúp giữ môi trường học tập lành mạnh! 🙏';
    }

    // Câu hỏi về tài khoản
    if (
      messageLower.includes("tài khoản") ||
      messageLower.includes("profile") ||
      messageLower.includes("thông tin cá nhân") ||
      messageLower.includes("đổi mật khẩu") ||
      messageLower.includes("cập nhật thông tin") ||
      messageLower.includes("avatar")
    ) {
      return 'Quản lý tài khoản:\n\n👤 Xem/Chỉnh sửa thông tin:\n   1. Nhấn vào avatar/icon tài khoản ở header\n   2. Chọn "Trang cá nhân" để xem profile\n   3. Chọn "Chỉnh sửa" để cập nhật thông tin\n\n🔐 Đổi mật khẩu:\n   1. Vào "Cài đặt" > "Đổi mật khẩu"\n   2. Nhập mật khẩu cũ và mật khẩu mới\n   3. Mật khẩu phải: Tối thiểu 6 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt\n\n🖼️ Đổi avatar:\n   Vào Trang cá nhân > Nhấn vào avatar > Chọn ảnh mới\n\nBạn cần hỗ trợ phần nào?';
    }

    // Câu hỏi về admin (nếu là admin)
    if (
      user?.role === "admin" &&
      (messageLower.includes("admin") ||
        messageLower.includes("quản trị") ||
        messageLower.includes("dashboard"))
    ) {
      return "Với tư cách Admin, bạn có quyền:\n\n✅ Duyệt/từ chối bài viết chờ duyệt\n👥 Quản lý người dùng: Xem, khóa/mở khóa tài khoản\n🔐 Phân quyền: Admin/User, Sinh viên/Giảng viên\n📢 Xử lý báo cáo từ người dùng\n📊 Xem thống kê hệ thống (Dashboard)\n👥 Quản lý nhóm, sự kiện\n\nTruy cập Dashboard: Vào menu Admin ở header.\n\nBạn cần hỗ trợ gì về quản trị hệ thống?";
    }

    // Lời chào
    if (
      messageLower.includes("xin chào") ||
      messageLower.includes("hello") ||
      messageLower.includes("hi") ||
      messageLower.includes("chào")
    ) {
      return `Xin chào ${
        user?.name || "bạn"
      }! 👋\n\nTôi là nhân viên hỗ trợ của hệ thống DNU Social. Tôi rất vui được giúp đỡ bạn!\n\nTôi có thể hỗ trợ bạn về:\n📝 Đăng bài và tài liệu\n👥 Nhóm học tập\n📅 Sự kiện\n💬 Tin nhắn\n⚙️ Quản lý tài khoản\n🔍 Tìm kiếm\n📢 Thông báo\n\nBạn có câu hỏi gì cần tôi giúp không? 😊`;
    }

    // Cảm ơn
    if (
      messageLower.includes("cảm ơn") ||
      messageLower.includes("thanks") ||
      messageLower.includes("thank you") ||
      messageLower.includes("cám ơn")
    ) {
      return "Rất vui được giúp đỡ bạn! 😊\n\nNếu bạn có câu hỏi gì khác về hệ thống, đừng ngại hỏi tôi nhé. Tôi luôn sẵn sàng hỗ trợ!\n\nChúc bạn có trải nghiệm tốt với DNU Social! 🎓";
    }

    // Câu hỏi về giờ học, lịch
    if (
      messageLower.includes("lịch") ||
      messageLower.includes("thời khóa biểu") ||
      messageLower.includes("lịch học") ||
      messageLower.includes("schedule")
    ) {
      return 'Hiện tại hệ thống chưa có tính năng quản lý lịch học. Bạn có thể:\n\n📅 Kiểm tra lịch học trên hệ thống chính của trường\n📅 Tạo sự kiện nhắc nhở trong phần "Sự kiện"\n👥 Tham gia nhóm lớp để cập nhật thông tin lịch học\n\nNếu bạn muốn tính năng này, có thể đề xuất với Admin để phát triển trong tương lai!';
    }

    // Câu hỏi về điểm số
    if (
      messageLower.includes("điểm") ||
      messageLower.includes("grade") ||
      messageLower.includes("điểm số") ||
      messageLower.includes("kết quả học tập")
    ) {
      return "Hệ thống DNU Social không quản lý điểm số. Để xem điểm:\n\n📊 Truy cập hệ thống quản lý điểm chính thức của trường\n📞 Liên hệ phòng Đào tạo\n👨‍🏫 Hỏi giảng viên trực tiếp\n\nHệ thống này tập trung vào việc chia sẻ thông tin học tập, tài liệu và kết nối cộng đồng.";
    }

    // Câu hỏi về đăng ký/đăng nhập
    if (
      messageLower.includes("đăng ký") ||
      messageLower.includes("register") ||
      messageLower.includes("tạo tài khoản")
    ) {
      return "Để đăng ký tài khoản:\n\n1️⃣ Vào trang đăng ký\n2️⃣ Điền thông tin:\n   • Tên đầy đủ\n   • Email\n   • Mật khẩu (tối thiểu 6 ký tự, có chữ hoa, thường, số và ký tự đặc biệt)\n   • Xác nhận mật khẩu\n   • Chọn vai trò: Sinh viên hoặc Giảng viên\n   • Chọn chuyên ngành\n3️⃣ Xác nhận email\n4️⃣ Đăng nhập\n\nBạn cần hỗ trợ gì trong quá trình đăng ký?";
    }

    // Câu hỏi về quên mật khẩu
    if (
      messageLower.includes("quên mật khẩu") ||
      messageLower.includes("forgot password") ||
      messageLower.includes("reset password")
    ) {
      return 'Để lấy lại mật khẩu:\n\n1️⃣ Vào trang đăng nhập\n2️⃣ Nhấn "Quên mật khẩu?"\n3️⃣ Nhập email đã đăng ký\n4️⃣ Kiểm tra email để nhận link đặt lại mật khẩu\n5️⃣ Nhấn vào link và đặt mật khẩu mới\n\nNếu không nhận được email, kiểm tra thư mục Spam hoặc liên hệ Admin.';
    }

    // Câu hỏi về lỗi/kỹ thuật
    if (
      messageLower.includes("lỗi") ||
      messageLower.includes("error") ||
      messageLower.includes("không hoạt động") ||
      messageLower.includes("bug")
    ) {
      return "Nếu gặp lỗi, hãy thử:\n\n1️⃣ Làm mới trang (F5 hoặc Ctrl+R)\n2️⃣ Xóa cache trình duyệt\n3️⃣ Đăng xuất và đăng nhập lại\n4️⃣ Kiểm tra kết nối internet\n5️⃣ Thử trình duyệt khác\n\nNếu vẫn lỗi:\n📧 Mô tả chi tiết lỗi và gửi cho Admin\n📸 Chụp ảnh màn hình lỗi (nếu có)\n\nBạn đang gặp lỗi gì? Mô tả chi tiết để tôi hỗ trợ tốt hơn!";
    }

    // Câu hỏi về upload ảnh/file
    if (
      messageLower.includes("upload") ||
      messageLower.includes("tải lên") ||
      messageLower.includes("đính kèm") ||
      messageLower.includes("gửi ảnh")
    ) {
      return "Hướng dẫn upload ảnh/file:\n\n📸 Upload ảnh:\n   • Tối đa 10 ảnh mỗi bài viết\n   • Mỗi ảnh tối đa 5MB\n   • Định dạng: JPG, PNG, GIF\n\n📎 Upload file:\n   • Tối đa 10 file\n   • Mỗi file tối đa 5MB\n   • Định dạng: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX\n\nNếu không upload được:\n   • Kiểm tra kích thước file\n   • Kiểm tra định dạng\n   • Thử file khác\n\nBạn gặp vấn đề gì khi upload?";
    }

    // Câu hỏi về chat/tin nhắn
    if (
      messageLower.includes("chat") ||
      messageLower.includes("tin nhắn") ||
      messageLower.includes("message") ||
      messageLower.includes("gửi tin nhắn")
    ) {
      return "Sử dụng tính năng Chat:\n\n💬 Mở chat: Nhấn icon tin nhắn ở góc dưới bên phải\n👤 Chọn người: Click vào tên trong danh sách\n📝 Gửi tin nhắn: Nhập và nhấn Enter hoặc nút gửi\n📷 Gửi ảnh: Nhấn icon hình ảnh\n📎 Gửi file: Nhấn icon đính kèm\n👥 Tạo nhóm chat: Nhấn icon nhóm trong khung chat\n\nXem trạng thái: ✓ (đã gửi), ✓✓ (đã đọc)\n\nBạn cần hỗ trợ gì về chat?";
    }

    // Câu hỏi về chặn người dùng
    if (
      messageLower.includes("chặn") ||
      messageLower.includes("block") ||
      messageLower.includes("bỏ chặn")
    ) {
      return 'Chặn/Bỏ chặn người dùng:\n\n🚫 Chặn:\n   1. Vào profile của người đó\n   2. Nhấn nút "..." > "Chặn"\n   Hoặc trong chat: Menu > "Chặn"\n\n✅ Bỏ chặn:\n   1. Vào profile của người đó\n   2. Nhấn "Bỏ chặn"\n\nKhi chặn: Bạn không thể nhận/gửi tin nhắn từ người đó.\n\nBạn cần hỗ trợ gì về tính năng này?';
    }

    // Câu hỏi về quyền hạn
    if (
      messageLower.includes("quyền") ||
      messageLower.includes("permission") ||
      messageLower.includes("không thể") ||
      messageLower.includes("không được phép")
    ) {
      return "Quyền hạn trong hệ thống:\n\n👨‍🎓 Sinh viên:\n   • Đăng bài, tham gia nhóm, đăng ký sự kiện\n   • Chat, tải tài liệu, bình luận\n\n👨‍🏫 Giảng viên:\n   • Tất cả quyền của Sinh viên\n   • Đăng tài liệu, tạo nhóm, tạo sự kiện\n\n👨‍💼 Admin:\n   • Quản lý toàn bộ hệ thống\n   • Duyệt bài viết, quản lý người dùng\n\nNếu bạn không thể thực hiện một hành động, có thể do quyền hạn. Liên hệ Admin nếu cần!";
    }

    // Câu hỏi về chuyên ngành/ngành học
    if (
      messageLower.includes("chuyên ngành") ||
      messageLower.includes("ngành học") ||
      messageLower.includes("major") ||
      messageLower.includes("khoa")
    ) {
      return "Các khối ngành tại Đại học Đồng Nai:\n\n🏥 Sức khỏe:\n   • Y khoa, Dược học, Điều dưỡng\n\n💻 Kỹ thuật - Công nghệ:\n   • Công nghệ thông tin, Khoa học máy tính\n   • Điện - điện tử, Cơ điện tử\n   • Xây dựng, Kiến trúc\n\n💼 Kinh tế - Kinh doanh:\n   • Quản trị kinh doanh, Marketing\n   • Tài chính - Ngân hàng, Kế toán\n   • Logistics, Thương mại điện tử\n\n📚 Khoa học Xã hội:\n   • Ngôn ngữ Anh, Ngôn ngữ Trung\n   • Luật, Sư phạm\n\nBạn học ngành nào? Tôi có thể hỗ trợ thêm!";
    }

    // 👥 CHỦ ĐỀ 2: NHÓM HỌC TẬP - Câu hỏi bổ sung
    if (
      messageLower.includes("tìm nhóm học tập") ||
      messageLower.includes("nhóm đang hoạt động") ||
      messageLower.includes("khám phá nhóm")
    ) {
      return 'Để tìm các nhóm học tập:\n\n1️⃣ Vào tab "Nhóm học tập" trên trang chủ\n2️⃣ Chọn "Khám phá" để xem tất cả nhóm\n3️⃣ Lọc theo chuyên ngành hoặc tìm kiếm theo tên\n\n💡 Bạn có thể:\n   • Tìm nhóm theo môn học cụ thể\n   • Xem nhóm công khai hoặc xin tham gia nhóm kín\n   • Xem số thành viên và hoạt động của nhóm\n\nBạn muốn tìm nhóm nào?';
    }

    if (
      messageLower.includes("nhóm tiếng anh") ||
      messageLower.includes("nhóm môn học") ||
      messageLower.includes("tìm nhóm theo môn")
    ) {
      return 'Để tìm nhóm học môn cụ thể:\n\n1️⃣ Vào "Nhóm học tập" > "Khám phá"\n2️⃣ Tìm kiếm với từ khóa: Tên môn học (ví dụ: "Tiếng Anh", "Toán")\n3️⃣ Hoặc lọc theo chuyên ngành\n\n💡 Ví dụ:\n   • "Tiếng Anh chuyên ngành" → Tìm nhóm Tiếng Anh\n   • "Toán cao cấp" → Tìm nhóm Toán\n\nBạn muốn tìm nhóm môn học nào?';
    }

    if (
      messageLower.includes("xin tham gia nhóm kín") ||
      messageLower.includes("tham gia nhóm kín") ||
      messageLower.includes("gửi yêu cầu nhóm")
    ) {
      return 'Để xin tham gia nhóm kín:\n\n1️⃣ Tìm nhóm trong danh sách\n2️⃣ Nhấn "Xin tham gia" hoặc "Gửi yêu cầu"\n3️⃣ Trưởng nhóm sẽ duyệt yêu cầu của bạn\n4️⃣ Bạn sẽ nhận thông báo khi được chấp nhận\n\n⏰ Thời gian duyệt: Tùy theo trưởng nhóm\n\nBạn đã gửi yêu cầu tham gia nhóm nào?';
    }

    if (
      messageLower.includes("tạo nhóm học tập mới") ||
      messageLower.includes("tạo nhóm cho lớp")
    ) {
      return 'Để tạo nhóm học tập mới:\n\n⚠️ Lưu ý: Chỉ Giảng viên và Admin mới có quyền tạo nhóm\n\nNếu bạn là Giảng viên:\n1️⃣ Nhấn "Tạo nhóm"\n2️⃣ Điền thông tin: Tên, mô tả, chuyên ngành\n3️⃣ Chọn quyền truy cập (Công khai/Riêng tư)\n4️⃣ Tạo nhóm\n\nNếu bạn là Sinh viên:\n   • Liên hệ Giảng viên hoặc Admin để tạo nhóm\n   • Hoặc đề xuất tạo nhóm trong nhóm lớp hiện có\n\nBạn muốn tạo nhóm cho lớp nào?';
    }

    if (
      messageLower.includes("mời bạn bè vào nhóm") ||
      messageLower.includes("thêm thành viên nhóm")
    ) {
      return 'Để mời bạn bè vào nhóm:\n\n1️⃣ Vào nhóm > Nhấn "Thêm thành viên"\n2️⃣ Tìm kiếm bạn bè theo tên/email\n3️⃣ Gửi lời mời\n\n💡 Hoặc:\n   • Chia sẻ link nhóm (nếu nhóm công khai)\n   • Trưởng nhóm có thể thêm trực tiếp\n\n⚠️ Lưu ý: Chỉ trưởng nhóm và thành viên có quyền mời người khác.\n\nBạn muốn mời ai vào nhóm?';
    }

    if (
      messageLower.includes("tham gia tối đa bao nhiêu nhóm") ||
      messageLower.includes("giới hạn nhóm")
    ) {
      return "Về số lượng nhóm tham gia:\n\n✅ Hiện tại không có giới hạn số lượng nhóm\n✅ Bạn có thể tham gia nhiều nhóm tùy ý\n\n💡 Mẹo:\n   • Tham gia các nhóm liên quan đến môn học của bạn\n   • Tham gia nhóm lớp, nhóm chuyên ngành\n   • Quản lý thông báo từ các nhóm\n\nBạn đang tham gia bao nhiêu nhóm?";
    }

    if (
      messageLower.includes("rời khỏi nhóm") ||
      messageLower.includes("rời nhóm")
    ) {
      return 'Để rời khỏi nhóm:\n\n1️⃣ Vào nhóm > Nhấn nút "..." > Chọn "Rời nhóm"\n2️⃣ Xác nhận rời nhóm\n\n⚠️ Lưu ý:\n   • Nếu là trưởng nhóm, cần chuyển quyền trước\n   • Sau khi rời, bạn sẽ không nhận thông báo từ nhóm\n   • Có thể tham gia lại sau nếu muốn\n\nBạn chắc chắn muốn rời nhóm không?';
    }

    if (
      messageLower.includes("quyền trưởng nhóm") ||
      messageLower.includes("trưởng nhóm có quyền gì")
    ) {
      return "Trưởng nhóm có các quyền:\n\n✅ Thêm/xóa thành viên\n✅ Chỉnh sửa thông tin nhóm (tên, mô tả, ảnh đại diện)\n✅ Quản lý bài viết trong nhóm (xóa, ghim)\n✅ Chuyển quyền trưởng nhóm cho người khác\n✅ Xóa nhóm\n✅ Duyệt yêu cầu tham gia (nếu nhóm kín)\n\nBạn là trưởng nhóm nào? Tôi có thể hướng dẫn chi tiết hơn!";
    }

    if (
      messageLower.includes("chuyển quyền trưởng nhóm") ||
      messageLower.includes("chuyển trưởng nhóm")
    ) {
      return 'Để chuyển quyền trưởng nhóm:\n\n1️⃣ Vào nhóm > "Cài đặt nhóm" > "Thành viên"\n2️⃣ Chọn thành viên muốn chuyển quyền\n3️⃣ Nhấn "Chuyển quyền trưởng nhóm"\n4️⃣ Xác nhận\n\n⚠️ Lưu ý:\n   • Chỉ trưởng nhóm hiện tại mới có quyền chuyển\n   • Sau khi chuyển, bạn sẽ trở thành thành viên thường\n   • Không thể hoàn tác\n\nBạn muốn chuyển quyền cho ai?';
    }

    if (
      messageLower.includes("đuổi thành viên") ||
      messageLower.includes("xóa thành viên khỏi nhóm")
    ) {
      return 'Để đuổi thành viên khỏi nhóm:\n\nNếu bạn là trưởng nhóm:\n1️⃣ Vào danh sách thành viên\n2️⃣ Chọn người muốn đuổi\n3️⃣ Nhấn "Xóa khỏi nhóm"\n4️⃣ Xác nhận\n\nNếu bạn không phải trưởng nhóm:\n   • Báo cáo với trưởng nhóm\n   • Hoặc báo cáo với Admin\n\n⚠️ Lưu ý: Chỉ trưởng nhóm mới có quyền đuổi thành viên.\n\nBạn gặp vấn đề gì với thành viên này?';
    }

    if (
      messageLower.includes("ghim tin nhắn nhóm") ||
      messageLower.includes("ghim thông báo nhóm")
    ) {
      return 'Để ghim tin nhắn thông báo trong nhóm:\n\n1️⃣ Vào chat nhóm\n2️⃣ Tìm tin nhắn muốn ghim\n3️⃣ Nhấn nút "..." trên tin nhắn\n4️⃣ Chọn "Ghim tin nhắn"\n\n💡 Tin nhắn được ghim sẽ:\n   • Hiển thị ở đầu chat nhóm\n   • Dễ dàng tìm lại thông tin quan trọng\n\nBạn muốn ghim tin nhắn nào?';
    }

    if (
      messageLower.includes("chia sẻ tài liệu chỉ cho nhóm") ||
      messageLower.includes("tài liệu nhóm")
    ) {
      return "Để chia sẻ tài liệu chỉ cho thành viên nhóm:\n\n1️⃣ Đăng bài trong nhóm (không đăng ở trang chủ)\n2️⃣ Chỉ thành viên nhóm mới thấy bài viết\n3️⃣ Hoặc tạo nhóm riêng tư để chia sẻ tài liệu\n\n💡 Mẹo:\n   • Sử dụng nhóm kín cho tài liệu nội bộ\n   • Đánh dấu tài liệu quan trọng\n\nBạn muốn chia sẻ tài liệu gì?";
    }

    if (
      messageLower.includes("ai là trưởng nhóm") ||
      messageLower.includes("trưởng nhóm là ai")
    ) {
      return 'Để xem ai là trưởng nhóm:\n\n1️⃣ Vào nhóm > "Thành viên"\n2️⃣ Xem danh sách\n3️⃣ Trưởng nhóm sẽ có badge "Trưởng nhóm" hoặc icon đặc biệt\n\n💡 Hoặc:\n   • Xem trong phần "Giới thiệu nhóm"\n   • Hỏi các thành viên khác\n\nBạn muốn xem trưởng nhóm của nhóm nào?';
    }

    if (
      messageLower.includes("tắt thông báo nhóm") ||
      messageLower.includes("tắt thông báo từ nhóm")
    ) {
      return 'Để tắt thông báo từ nhóm:\n\n1️⃣ Vào nhóm > "Cài đặt nhóm" > "Thông báo"\n2️⃣ Chọn "Tắt thông báo" hoặc "Chỉ thông báo quan trọng"\n\n💡 Hoặc:\n   • Tắt thông báo trong phần Cài đặt tài khoản\n   • Chọn nhóm cụ thể để tắt thông báo\n\nBạn muốn tắt thông báo từ nhóm nào?';
    }

    if (
      messageLower.includes("lịch họp nhóm") ||
      messageLower.includes("nhóm có lịch họp")
    ) {
      return 'Về lịch họp nhóm:\n\n📅 Xem trong phần "Sự kiện" của nhóm\n📢 Hoặc xem thông báo từ trưởng nhóm\n\n💡 Bạn có thể:\n   • Tạo sự kiện trong nhóm để thông báo lịch họp\n   • Đặt lịch họp online/offline\n   • Nhắc nhở thành viên\n\nBạn muốn tạo lịch họp cho nhóm không?';
    }

    if (
      messageLower.includes("báo cáo nhóm") ||
      messageLower.includes("báo cáo nhóm xấu")
    ) {
      return 'Để báo cáo nhóm có nội dung xấu:\n\n1️⃣ Vào nhóm > Nhấn nút "..." > "Báo cáo nhóm"\n2️⃣ Chọn lý do:\n   • Nội dung không phù hợp\n   • Spam\n   • Quấy rối\n   • Vi phạm quy định\n3️⃣ Mô tả chi tiết\n4️⃣ Gửi báo cáo\n\n✅ Admin sẽ xem xét và xử lý\n\nBạn gặp vấn đề gì với nhóm này?';
    }

    if (
      messageLower.includes("đổi tên nhóm") ||
      messageLower.includes("đổi tên nhóm học tập")
    ) {
      return 'Để đổi tên nhóm:\n\n⚠️ Chỉ trưởng nhóm mới có quyền\n\n1️⃣ Vào "Cài đặt nhóm" > "Thông tin nhóm"\n2️⃣ Chọn "Chỉnh sửa tên"\n3️⃣ Nhập tên mới\n4️⃣ Lưu thay đổi\n\n💡 Lưu ý: Tên mới sẽ được cập nhật ngay và tất cả thành viên sẽ thấy.\n\nBạn muốn đổi tên nhóm thành gì?';
    }

    if (
      messageLower.includes("danh sách thành viên nhóm") ||
      messageLower.includes("xem thành viên nhóm")
    ) {
      return 'Để xem danh sách thành viên nhóm:\n\n1️⃣ Vào nhóm > Tab "Thành viên"\n2️⃣ Xem danh sách đầy đủ với thông tin cơ bản\n\n💡 Bạn có thể:\n   • Xem số lượng thành viên\n   • Xem thông tin từng thành viên\n   • Xem ai là trưởng nhóm\n\nBạn muốn xem thành viên nhóm nào?';
    }

    // 📅 CHỦ ĐỀ 3: SỰ KIỆN - Câu hỏi bổ sung
    if (
      messageLower.includes("lịch sự kiện") ||
      messageLower.includes("sự kiện sắp diễn ra") ||
      messageLower.includes("xem sự kiện")
    ) {
      return 'Để xem lịch các sự kiện:\n\n1️⃣ Vào tab "Sự kiện" trên trang chủ hoặc trang "Sự kiện" riêng\n2️⃣ Lọc theo "Sắp diễn ra"\n3️⃣ Xem chi tiết từng sự kiện\n\n💡 Bạn có thể:\n   • Lọc theo danh mục (Học thuật, Thi đấu, Workshop...)\n   • Lọc theo trạng thái (Sắp diễn ra, Đang diễn ra, Đã kết thúc)\n   • Tìm kiếm sự kiện theo tên\n\nBạn muốn tìm sự kiện nào?';
    }

    if (
      messageLower.includes("sự kiện dành cho sinh viên năm mấy") ||
      messageLower.includes("sự kiện cho năm")
    ) {
      return "Về đối tượng tham gia sự kiện:\n\n📋 Xem trong phần mô tả sự kiện\n👥 Hoặc liên hệ người tổ chức để biết thêm\n\n💡 Thông thường:\n   • Sự kiện có thể dành cho tất cả sinh viên\n   • Hoặc chỉ dành cho sinh viên năm cụ thể\n   • Hoặc chỉ dành cho giảng viên\n\nBạn muốn tìm sự kiện cho năm mấy?";
    }

    if (
      messageLower.includes("đăng ký hội thảo") ||
      messageLower.includes("đăng ký tham gia sự kiện")
    ) {
      return 'Để đăng ký tham gia sự kiện:\n\n1️⃣ Vào trang "Sự kiện" > Chọn sự kiện\n2️⃣ Nhấn "Đăng ký quan tâm" hoặc "Tham gia sự kiện"\n3️⃣ Điền thông tin nếu cần\n\n✅ Sau khi đăng ký:\n   • Bạn sẽ nhận thông báo về sự kiện\n   • Có thể xem lại trong "Sự kiện của tôi"\n\nBạn muốn đăng ký sự kiện nào?';
    }

    if (
      messageLower.includes("sự kiện online hay offline") ||
      messageLower.includes("sự kiện tổ chức")
    ) {
      return 'Để biết sự kiện online hay offline:\n\n📍 Xem trong phần "Địa điểm" của sự kiện:\n   • Nếu có link Zoom/Meet → Online\n   • Nếu có địa chỉ cụ thể → Offline\n\n💡 Thông tin thường bao gồm:\n   • Địa điểm cụ thể (nếu offline)\n   • Link tham gia (nếu online)\n   • Hướng dẫn tham gia\n\nBạn muốn biết về sự kiện nào?';
    }

    if (
      messageLower.includes("sự kiện đã đăng ký") ||
      messageLower.includes("danh sách sự kiện đã đăng ký")
    ) {
      return 'Để xem lại các sự kiện đã đăng ký:\n\n1️⃣ Vào "Sự kiện" > Lọc "Sự kiện của tôi" hoặc "Đã đăng ký"\n2️⃣ Xem danh sách đầy đủ\n\n💡 Bạn có thể:\n   • Xem chi tiết từng sự kiện\n   • Hủy đăng ký nếu cần\n   • Xem lịch sự kiện sắp tới\n\nBạn đã đăng ký bao nhiêu sự kiện?';
    }

    if (
      messageLower.includes("hủy đăng ký sự kiện") ||
      messageLower.includes("bỏ quan tâm sự kiện")
    ) {
      return 'Để hủy đăng ký sự kiện:\n\n1️⃣ Vào chi tiết sự kiện đã đăng ký\n2️⃣ Nhấn "Bỏ quan tâm" hoặc "Rời sự kiện"\n3️⃣ Xác nhận hủy\n\n⚠️ Lưu ý:\n   • Bạn sẽ không nhận thông báo về sự kiện nữa\n   • Có thể đăng ký lại sau nếu muốn\n\nBạn chắc chắn muốn hủy không?';
    }

    if (
      messageLower.includes("cộng điểm rèn luyện") ||
      messageLower.includes("điểm rèn luyện sự kiện")
    ) {
      return "Về điểm rèn luyện:\n\n📊 Tùy theo quy định của từng sự kiện\n📋 Xem trong mô tả sự kiện hoặc hỏi người tổ chức\n\n⚠️ Lưu ý:\n   • Hệ thống không tự động cộng điểm\n   • Cần xác nhận từ phòng Đào tạo\n   • Mỗi sự kiện có quy định riêng\n\nBạn muốn biết về sự kiện nào?";
    }

    if (
      messageLower.includes("giới hạn số lượng người tham gia") ||
      messageLower.includes("số lượng tối đa sự kiện")
    ) {
      return 'Về giới hạn số lượng người tham gia:\n\n✅ Có, mỗi sự kiện có số lượng tối đa\n📊 Xem trong thông tin sự kiện: "X người tham gia / Y tối đa"\n\n⚠️ Nếu đã đầy:\n   • Bạn sẽ không đăng ký được\n   • Có thể đăng ký chờ (nếu có)\n   • Hoặc liên hệ người tổ chức\n\nBạn muốn đăng ký sự kiện nào?';
    }

    if (
      messageLower.includes("vé mời") ||
      messageLower.includes("mã qr check-in") ||
      messageLower.includes("check-in sự kiện")
    ) {
      return "Về vé mời và check-in:\n\n🎫 Tùy theo quy định của từng sự kiện\n📋 Xem trong mô tả sự kiện\n\n💡 Thông thường:\n   • Một số sự kiện cần vé mời\n   • Một số sự kiện cần mã QR để check-in\n   • Thường sẽ có thông báo trước sự kiện\n\nBạn muốn biết về sự kiện nào?";
    }

    if (
      messageLower.includes("video quay lại sự kiện") ||
      messageLower.includes("record sự kiện")
    ) {
      return 'Về video quay lại sự kiện:\n\n📹 Tùy theo người tổ chức có quay lại hay không\n📋 Xem trong phần "Tài liệu" hoặc thông báo sau sự kiện\n\n💡 Hoặc:\n   • Liên hệ người tổ chức\n   • Kiểm tra trong nhóm sự kiện (nếu có)\n\nBạn muốn xem video sự kiện nào?';
    }

    if (
      messageLower.includes("giấy chứng nhận tham gia") ||
      messageLower.includes("chứng nhận sự kiện")
    ) {
      return "Về giấy chứng nhận tham gia:\n\n📜 Liên hệ người tổ chức sự kiện\n📧 Hoặc xem trong thông báo sau sự kiện\n\n⚠️ Lưu ý:\n   • Hệ thống không tự động cấp chứng nhận\n   • Cần yêu cầu từ người tổ chức\n   • Một số sự kiện không có chứng nhận\n\nBạn muốn nhận chứng nhận sự kiện nào?";
    }

    if (
      messageLower.includes("thêm lịch sự kiện vào google calendar") ||
      messageLower.includes("google calendar")
    ) {
      return "Về thêm lịch sự kiện vào Google Calendar:\n\n⚠️ Hiện tại chưa có tính năng tích hợp trực tiếp\n\n💡 Bạn có thể:\n   • Copy thông tin sự kiện và thêm thủ công vào Google Calendar\n   • Hoặc đề xuất Admin phát triển tính năng này\n\n📝 Tính năng này sẽ giúp:\n   • Đồng bộ lịch sự kiện\n   • Nhắc nhở tự động\n\nBạn muốn đề xuất tính năng này không?";
    }

    if (
      messageLower.includes("mời người ngoài trường") ||
      messageLower.includes("người ngoài tham gia sự kiện")
    ) {
      return "Về mời người ngoài trường:\n\n⚠️ Tùy theo quy định của từng sự kiện\n📋 Xem trong mô tả sự kiện\n\n💡 Thông thường:\n   • Sự kiện chỉ dành cho sinh viên/giảng viên trong trường\n   • Một số sự kiện có thể mở rộng\n   • Cần xin phép người tổ chức\n\nBạn muốn mời ai tham gia?";
    }

    if (
      messageLower.includes("không đăng ký được sự kiện") ||
      messageLower.includes("tại sao không đăng ký")
    ) {
      return "Nếu không đăng ký được sự kiện, có thể do:\n\n❌ Sự kiện đã đầy (đã đạt số lượng tối đa)\n❌ Sự kiện đã kết thúc\n❌ Bạn không đủ điều kiện tham gia\n❌ Sự kiện đã đóng đăng ký\n\n💡 Cách khắc phục:\n   • Kiểm tra thông tin sự kiện\n   • Liên hệ người tổ chức\n   • Đăng ký sự kiện khác\n\nBạn gặp vấn đề với sự kiện nào?";
    }

    // 🔍 CHỦ ĐỀ 4: TÌM KIẾM THÔNG TIN - Câu hỏi bổ sung
    if (
      messageLower.includes("tìm bài viết cũ") ||
      messageLower.includes("tìm bài viết")
    ) {
      return 'Để tìm kiếm bài viết cũ:\n\n1️⃣ Sử dụng thanh tìm kiếm ở header\n2️⃣ Nhập từ khóa liên quan\n3️⃣ Lọc kết quả theo "Bài viết"\n\n💡 Mẹo:\n   • Sử dụng từ khóa cụ thể\n   • Tìm theo hashtag\n   • Tìm theo tên người đăng\n\nBạn muốn tìm bài viết về chủ đề gì?';
    }

    if (
      messageLower.includes("tìm tài liệu theo giảng viên") ||
      messageLower.includes("tài liệu giảng viên")
    ) {
      return 'Để tìm tài liệu theo tên giảng viên:\n\n1️⃣ Tìm kiếm tên giảng viên\n2️⃣ Lọc kết quả theo "Người dùng"\n3️⃣ Vào profile giảng viên > Xem bài viết/tài liệu của họ\n\n💡 Hoặc:\n   • Tìm trong nhóm của giảng viên\n   • Xem tài liệu được chia sẻ\n\nBạn muốn tìm tài liệu của giảng viên nào?';
    }

    if (
      messageLower.includes("lọc kết quả theo ngày") ||
      messageLower.includes("tìm theo ngày tháng")
    ) {
      return 'Về lọc kết quả theo ngày tháng:\n\n⚠️ Hiện tại chưa có tính năng lọc theo ngày\n\n💡 Bạn có thể:\n   • Sắp xếp theo "Mới nhất" hoặc "Cũ nhất"\n   • Hoặc đề xuất Admin phát triển tính năng này\n\n📝 Tính năng này sẽ giúp:\n   • Tìm bài viết trong khoảng thời gian cụ thể\n   • Lọc kết quả chính xác hơn\n\nBạn muốn tìm bài viết trong khoảng thời gian nào?';
    }

    if (
      messageLower.includes("bài viết nhiều like") ||
      messageLower.includes("bài viết phổ biến")
    ) {
      return 'Để tìm các bài viết có nhiều lượt like:\n\n1️⃣ Sắp xếp kết quả tìm kiếm theo "Phổ biến nhất"\n2️⃣ Hoặc xem trong phần "Xu hướng" ở sidebar\n\n💡 Bạn có thể:\n   • Xem bài viết hot nhất\n   • Xem bài viết được tương tác nhiều nhất\n   • Tìm nội dung phổ biến\n\nBạn muốn tìm bài viết về chủ đề gì?';
    }

    if (
      messageLower.includes("tìm bạn bè qua mã số sinh viên") ||
      messageLower.includes("mã số sinh viên")
    ) {
      return 'Để tìm bạn bè qua mã số sinh viên:\n\n1️⃣ Tìm kiếm với mã số sinh viên\n2️⃣ Hoặc vào "Tìm kiếm" > "Người dùng" > Nhập mã số\n\n⚠️ Lưu ý:\n   • Chỉ tìm được nếu người đó đã nhập mã số vào profile\n   • Mã số phải chính xác\n\nBạn muốn tìm ai?';
    }

    if (
      messageLower.includes("không ra kết quả") ||
      messageLower.includes("không tìm thấy")
    ) {
      return "Nếu không ra kết quả tìm kiếm:\n\n💡 Hãy thử:\n   • Từ khóa khác, đơn giản hơn\n   • Kiểm tra chính tả\n   • Thử tìm bằng tiếng Việt không dấu\n   • Hoặc tìm theo hashtag\n\n🔍 Mẹo:\n   • Sử dụng từ khóa ngắn gọn\n   • Tìm theo tên người, nhóm, sự kiện\n   • Thử nhiều từ khóa khác nhau\n\nBạn đang tìm gì? Tôi có thể gợi ý từ khóa!";
    }

    if (
      messageLower.includes("tìm kiếm nội dung trong file") ||
      messageLower.includes("tìm trong file tài liệu")
    ) {
      return "Về tìm kiếm nội dung trong file:\n\n⚠️ Hiện tại chưa hỗ trợ tìm kiếm nội dung trong file\n\n💡 Bạn có thể:\n   • Tìm theo tên file hoặc mô tả bài viết\n   • Hoặc đề xuất Admin phát triển tính năng này\n\n📝 Tính năng này sẽ giúp:\n   • Tìm nội dung cụ thể trong file PDF/Word\n   • Tìm kiếm chính xác hơn\n\nBạn muốn tìm nội dung gì trong file?";
    }

    if (
      messageLower.includes("lịch sử từ khóa") ||
      messageLower.includes("từ khóa đã tìm")
    ) {
      return "Về lịch sử từ khóa đã tìm kiếm:\n\n⚠️ Hiện tại chưa có tính năng lưu lịch sử tìm kiếm\n\n💡 Bạn có thể:\n   • Ghi nhớ các từ khóa đã tìm\n   • Hoặc đề xuất Admin phát triển tính năng này\n\n📝 Tính năng này sẽ giúp:\n   • Xem lại các từ khóa đã tìm\n   • Tìm nhanh lại nội dung đã xem\n\nBạn muốn tìm lại nội dung nào?";
    }

    if (
      messageLower.includes("tìm nhóm liên quan đến") ||
      messageLower.includes("tìm nhóm it")
    ) {
      return 'Để tìm các nhóm học tập liên quan:\n\n1️⃣ Tìm kiếm với từ khóa (ví dụ: "IT", "Công nghệ thông tin")\n2️⃣ Lọc kết quả theo "Nhóm"\n\n💡 Hoặc:\n   • Vào "Nhóm học tập" > "Khám phá" > Tìm kiếm\n   • Lọc theo chuyên ngành\n\nBạn muốn tìm nhóm về chủ đề gì?';
    }

    if (
      messageLower.includes("tìm thông báo cũ") ||
      messageLower.includes("thông báo phòng đào tạo")
    ) {
      return 'Để tìm các thông báo cũ:\n\n1️⃣ Vào phần "Thông báo" (icon chuông)\n2️⃣ Lọc theo người gửi hoặc từ khóa\n3️⃣ Hoặc tìm kiếm "phòng đào tạo" trong thanh tìm kiếm\n\n💡 Bạn có thể:\n   • Xem thông báo theo thời gian\n   • Tìm thông báo từ người gửi cụ thể\n   • Lọc theo loại thông báo\n\nBạn muốn tìm thông báo gì?';
    }

    // ⚙️ CHỦ ĐỀ 5: QUẢN LÝ TÀI KHOẢN - Câu hỏi bổ sung
    if (
      messageLower.includes("cập nhật số điện thoại") ||
      messageLower.includes("đổi số điện thoại")
    ) {
      return 'Để cập nhật số điện thoại:\n\n1️⃣ Vào "Trang cá nhân" > "Chỉnh sửa thông tin"\n2️⃣ Cập nhật số điện thoại\n3️⃣ Lưu thay đổi\n\n💡 Lưu ý:\n   • Số điện thoại dùng để xác thực tài khoản\n   • Có thể cần xác nhận qua SMS\n\nBạn cần cập nhật số điện thoại mới?';
    }

    if (
      messageLower.includes("đổi email liên kết") ||
      messageLower.includes("thay đổi email")
    ) {
      return 'Để đổi email liên kết với tài khoản:\n\n1️⃣ Vào "Cài đặt" > "Thông tin tài khoản"\n2️⃣ Chọn "Đổi email"\n3️⃣ Nhập email mới và xác nhận qua email\n\n⚠️ Lưu ý:\n   • Cần xác nhận email mới\n   • Email cũ sẽ không còn dùng được để đăng nhập\n\nBạn muốn đổi email thành gì?';
    }

    if (
      messageLower.includes("chỉnh sửa thông tin khoa lớp") ||
      messageLower.includes("cập nhật khoa lớp")
    ) {
      return 'Để chỉnh sửa thông tin Khoa/Lớp:\n\n1️⃣ Vào "Trang cá nhân" > "Chỉnh sửa thông tin"\n2️⃣ Cập nhật Khoa/Lớp\n3️⃣ Lưu thay đổi\n\n💡 Lưu ý:\n   • Thông tin này dùng để tìm kiếm và kết nối\n   • Có thể ảnh hưởng đến nhóm và sự kiện được đề xuất\n\nBạn cần cập nhật thông tin gì?';
    }

    if (
      messageLower.includes("bảo mật 2 lớp") ||
      messageLower.includes("2fa") ||
      messageLower.includes("xác thực 2 bước")
    ) {
      return "Về bảo mật 2 lớp (2FA):\n\n⚠️ Hiện tại hệ thống chưa hỗ trợ 2FA\n\n💡 Bạn nên:\n   • Sử dụng mật khẩu mạnh\n   • Không chia sẻ thông tin đăng nhập\n   • Đăng xuất khi dùng máy công cộng\n\n📝 Tính năng 2FA sẽ giúp:\n   • Bảo mật tài khoản tốt hơn\n   • Bảo vệ khỏi đăng nhập trái phép\n\nBạn muốn đề xuất tính năng này không?";
    }

    if (
      messageLower.includes("lịch sử đăng nhập") ||
      messageLower.includes("xem đăng nhập")
    ) {
      return "Về lịch sử đăng nhập:\n\n⚠️ Hiện tại chưa có tính năng này\n\n💡 Bạn có thể:\n   • Kiểm tra email thông báo đăng nhập (nếu có)\n   • Hoặc đề xuất Admin phát triển\n\n📝 Tính năng này sẽ giúp:\n   • Xem lịch sử đăng nhập\n   • Phát hiện đăng nhập bất thường\n\nBạn có nghi ngờ tài khoản bị xâm nhập không?";
    }

    if (
      messageLower.includes("đăng xuất thiết bị khác") ||
      messageLower.includes("đăng xuất từ xa")
    ) {
      return 'Để đăng xuất khỏi các thiết bị khác:\n\n1️⃣ Vào "Cài đặt" > "Bảo mật" > "Quản lý thiết bị"\n2️⃣ Xem danh sách thiết bị đã đăng nhập\n3️⃣ Nhấn "Đăng xuất" trên thiết bị muốn đăng xuất\n\n💡 Hoặc:\n   • Đổi mật khẩu để đăng xuất tất cả\n   • Liên hệ Admin nếu nghi ngờ bị xâm nhập\n\nBạn muốn đăng xuất thiết bị nào?';
    }

    if (
      messageLower.includes("khóa tạm thời tài khoản") ||
      messageLower.includes("tạm khóa tài khoản")
    ) {
      return "Về khóa tạm thời tài khoản:\n\n⚠️ Hiện tại chưa có tính năng tự khóa tài khoản\n\n💡 Bạn có thể:\n   • Đăng xuất và không sử dụng\n   • Hoặc liên hệ Admin để khóa tạm thời\n\n📝 Tính năng này sẽ giúp:\n   • Tạm dừng tài khoản khi cần\n   • Bảo vệ thông tin cá nhân\n\nBạn có lý do đặc biệt cần khóa tài khoản không?";
    }

    if (
      messageLower.includes("xóa vĩnh viễn tài khoản") ||
      messageLower.includes("xóa tài khoản")
    ) {
      return 'Để xóa vĩnh viễn tài khoản:\n\n1️⃣ Liên hệ Admin để yêu cầu xóa tài khoản\n2️⃣ Hoặc vào "Cài đặt" > "Xóa tài khoản" (nếu có)\n\n⚠️ Lưu ý:\n   • Không thể khôi phục sau khi xóa\n   • Tất cả dữ liệu sẽ bị xóa vĩnh viễn\n   • Bài viết, nhóm, sự kiện sẽ bị ảnh hưởng\n\nBạn chắc chắn muốn xóa tài khoản không?';
    }

    if (
      messageLower.includes("liên kết google") ||
      messageLower.includes("liên kết facebook") ||
      messageLower.includes("đăng nhập bằng")
    ) {
      return "Về liên kết tài khoản với Google/Facebook:\n\n⚠️ Hiện tại chưa hỗ trợ đăng nhập bằng Google/Facebook\n\n💡 Bạn phải:\n   • Đăng ký và đăng nhập bằng email/mật khẩu\n   • Hoặc đề xuất Admin phát triển tính năng này\n\n📝 Tính năng này sẽ giúp:\n   • Đăng nhập nhanh hơn\n   • Không cần nhớ mật khẩu\n\nBạn muốn đề xuất tính năng này không?";
    }

    if (
      messageLower.includes("ẩn thông tin cá nhân") ||
      messageLower.includes("riêng tư") ||
      messageLower.includes("bảo mật thông tin")
    ) {
      return 'Để ẩn thông tin cá nhân với người lạ:\n\n1️⃣ Vào "Cài đặt" > "Quyền riêng tư"\n2️⃣ Chọn "Chỉ bạn bè" hoặc "Chỉ mình tôi" cho các thông tin\n3️⃣ Lưu cài đặt\n\n💡 Bạn có thể:\n   • Ẩn email, số điện thoại\n   • Ẩn danh sách bạn bè\n   • Ẩn bài viết\n\nBạn muốn ẩn thông tin gì?';
    }

    if (
      messageLower.includes("tài khoản bị khóa") ||
      messageLower.includes("mở khóa tài khoản")
    ) {
      return "Nếu tài khoản bị khóa:\n\n1️⃣ Liên hệ Admin để được giải thích lý do\n2️⃣ Nếu do vi phạm: Chờ hết thời gian khóa hoặc liên hệ Admin\n3️⃣ Nếu do lỗi: Admin sẽ mở khóa ngay\n\n💡 Lý do thường gặp:\n   • Vi phạm quy định\n   • Spam hoặc hành vi không phù hợp\n   • Bảo mật tài khoản\n\nBạn biết lý do tài khoản bị khóa không?";
    }

    // 📢 CHỦ ĐỀ 6: THÔNG BÁO - Câu hỏi bổ sung
    if (
      messageLower.includes("xem lại thông báo cũ") ||
      messageLower.includes("thông báo cũ")
    ) {
      return 'Để xem lại các thông báo cũ:\n\n1️⃣ Nhấn icon chuông ở header\n2️⃣ Xem tất cả thông báo, có thể lọc theo loại\n3️⃣ Hoặc vào "Cài đặt" > "Thông báo" > "Lịch sử"\n\n💡 Bạn có thể:\n   • Xem thông báo theo thời gian\n   • Lọc theo loại (Bài viết, Bình luận, Like...)\n   • Tìm kiếm thông báo\n\nBạn muốn xem thông báo gì?';
    }

    if (
      messageLower.includes("không nhận được thông báo") ||
      messageLower.includes("không có thông báo")
    ) {
      return 'Nếu không nhận được thông báo:\n\n1️⃣ Kiểm tra cài đặt thông báo trong "Cài đặt" > "Thông báo"\n2️⃣ Đảm bảo đã bật thông báo cho bài viết\n3️⃣ Kiểm tra trình duyệt có chặn thông báo không\n\n💡 Cách khắc phục:\n   • Bật thông báo trong trình duyệt\n   • Kiểm tra cài đặt hệ thống\n   • Làm mới trang\n\nBạn muốn nhận thông báo về gì?';
    }

    if (
      messageLower.includes("tắt thông báo email") ||
      messageLower.includes("không nhận email")
    ) {
      return 'Để tắt thông báo gửi về email:\n\n1️⃣ Vào "Cài đặt" > "Thông báo" > "Email"\n2️⃣ Tắt các loại thông báo không muốn nhận\n3️⃣ Lưu cài đặt\n\n💡 Bạn có thể:\n   • Tắt tất cả email\n   • Chỉ nhận email quan trọng\n   • Tắt email cho từng loại thông báo\n\nBạn muốn tắt thông báo email nào?';
    }

    if (
      messageLower.includes("đánh dấu tất cả đã đọc") ||
      messageLower.includes("đánh dấu đã đọc")
    ) {
      return 'Để đánh dấu "Đã đọc" cho tất cả thông báo:\n\n1️⃣ Vào danh sách thông báo\n2️⃣ Nhấn "Đánh dấu tất cả đã đọc"\n3️⃣ Hoặc đánh dấu từng thông báo\n\n💡 Bạn có thể:\n   • Đánh dấu tất cả cùng lúc\n   • Đánh dấu từng thông báo\n   • Xóa thông báo đã đọc\n\nBạn có nhiều thông báo chưa đọc không?';
    }

    if (
      messageLower.includes("chỉ nhận thông báo quan trọng") ||
      messageLower.includes("thông báo quan trọng")
    ) {
      return 'Để chỉ nhận thông báo quan trọng:\n\n1️⃣ Vào "Cài đặt" > "Thông báo"\n2️⃣ Chọn "Chỉ thông báo quan trọng"\n3️⃣ Tùy chỉnh các loại thông báo muốn nhận\n\n💡 Thông báo quan trọng thường bao gồm:\n   • Thông báo từ Admin\n   • Thông báo về bài viết bị từ chối\n   • Thông báo về sự kiện\n\nBạn muốn nhận thông báo gì?';
    }

    if (
      messageLower.includes("tắt thông báo sinh nhật") ||
      messageLower.includes("thông báo sinh nhật bạn bè")
    ) {
      return 'Để tắt thông báo sinh nhật bạn bè:\n\n1️⃣ Vào "Cài đặt" > "Thông báo" > "Sự kiện"\n2️⃣ Tắt "Thông báo sinh nhật"\n\n💡 Bạn có thể:\n   • Tắt hoàn toàn\n   • Chỉ nhận thông báo sinh nhật bạn bè thân\n\nBạn muốn tắt thông báo sinh nhật không?';
    }

    if (
      messageLower.includes("thông báo giảng viên đăng bài") ||
      messageLower.includes("giảng viên đăng bài mới")
    ) {
      return 'Để nhận thông báo khi giảng viên đăng bài mới:\n\n1️⃣ Theo dõi giảng viên: Vào profile giảng viên > "Theo dõi"\n2️⃣ Hoặc tham gia nhóm của giảng viên\n3️⃣ Bật thông báo cho bài viết mới\n\n💡 Bạn sẽ nhận thông báo khi:\n   • Giảng viên đăng bài mới\n   • Giảng viên chia sẻ tài liệu\n   • Có thông báo trong nhóm\n\nBạn muốn theo dõi giảng viên nào?';
    }

    if (
      messageLower.includes("thông báo trên điện thoại bị chậm") ||
      messageLower.includes("thông báo chậm")
    ) {
      return "Nếu thông báo trên điện thoại bị chậm:\n\n1️⃣ Kiểm tra kết nối internet\n2️⃣ Kiểm tra cài đặt thông báo của trình duyệt\n3️⃣ Thử làm mới trang hoặc đăng nhập lại\n\n💡 Cách khắc phục:\n   • Bật thông báo push trong trình duyệt\n   • Kiểm tra cài đặt điện thoại\n   • Đảm bảo ứng dụng đang chạy\n\nBạn dùng trình duyệt gì?";
    }

    if (
      messageLower.includes("bật âm thanh thông báo") ||
      messageLower.includes("âm thanh thông báo")
    ) {
      return 'Để bật âm thanh cho thông báo ứng dụng:\n\n1️⃣ Vào "Cài đặt" > "Thông báo" > "Âm thanh"\n2️⃣ Bật "Phát âm thanh khi có thông báo"\n3️⃣ Chọn âm thanh (nếu có)\n\n💡 Lưu ý:\n   • Cần bật âm thanh trên thiết bị\n   • Một số trình duyệt không hỗ trợ\n\nBạn muốn bật âm thanh thông báo không?';
    }

    if (
      messageLower.includes("xóa thông báo") ||
      messageLower.includes("xóa bớt thông báo")
    ) {
      return 'Để xóa bớt các thông báo không cần thiết:\n\n1️⃣ Vào danh sách thông báo\n2️⃣ Nhấn icon "X" trên từng thông báo\n3️⃣ Hoặc chọn nhiều và xóa hàng loạt\n\n💡 Bạn có thể:\n   • Xóa từng thông báo\n   • Xóa nhiều thông báo cùng lúc\n   • Xóa tất cả thông báo cũ\n\nBạn muốn xóa thông báo nào?';
    }

    if (
      messageLower.includes("tắt thông báo nhóm chat cũ") ||
      messageLower.includes("thông báo nhóm chat")
    ) {
      return 'Để tắt thông báo từ các nhóm chat cũ:\n\n1️⃣ Vào nhóm > "Cài đặt nhóm" > "Thông báo"\n2️⃣ Chọn "Tắt thông báo"\n\n💡 Hoặc:\n   • Rời nhóm nếu không còn cần thiết\n   • Tắt thông báo trong phần Cài đặt tài khoản\n\nBạn muốn tắt thông báo từ nhóm nào?';
    }

    // ❓ CHỦ ĐỀ 7: HỖ TRỢ & KHÁC
    if (
      messageLower.includes("liên hệ hỗ trợ kỹ thuật") ||
      messageLower.includes("đội ngũ hỗ trợ")
    ) {
      return "Để liên hệ với đội ngũ hỗ trợ kỹ thuật:\n\n👨‍💼 Qua hệ thống:\n   • Tìm Admin trong danh sách người dùng\n   • Gửi tin nhắn trực tiếp\n\n📧 Email:\n   • it@dnu.edu.vn (ví dụ)\n   • Hoặc email phòng IT của trường\n\n💬 Chat với tôi:\n   • Tôi có thể hỗ trợ các câu hỏi về sử dụng hệ thống\n   • Nếu không giải quyết được, tôi sẽ hướng dẫn bạn liên hệ Admin\n\nBạn cần hỗ trợ về vấn đề gì?";
    }

    if (
      messageLower.includes("phiên bản mobile") ||
      messageLower.includes("ứng dụng điện thoại") ||
      messageLower.includes("mobile app")
    ) {
      return "Về phiên bản trên điện thoại:\n\n⚠️ Hiện tại chỉ có phiên bản web\n\n💡 Bạn có thể:\n   • Truy cập qua trình duyệt trên điện thoại\n   • Thêm vào màn hình chính (Add to Home Screen)\n   • Hoặc đề xuất Admin phát triển ứng dụng mobile\n\n📱 Ứng dụng mobile sẽ giúp:\n   • Sử dụng tiện lợi hơn\n   • Nhận thông báo push\n   • Tối ưu cho điện thoại\n\nBạn muốn đề xuất tính năng này không?";
    }

    if (
      messageLower.includes("phát hiện lỗi") ||
      messageLower.includes("báo cáo bug") ||
      messageLower.includes("báo lỗi")
    ) {
      return 'Để báo cáo lỗi (bug) trên web:\n\n1️⃣ Liên hệ Admin qua tin nhắn\n2️⃣ Hoặc gửi email mô tả lỗi kèm ảnh chụp màn hình\n3️⃣ Hoặc báo cáo trong phần "Hỗ trợ" (nếu có)\n\n💡 Khi báo cáo, hãy cung cấp:\n   • Mô tả chi tiết lỗi\n   • Ảnh chụp màn hình\n   • Các bước để tái hiện lỗi\n   • Trình duyệt và hệ điều hành\n\nBạn gặp lỗi gì? Mô tả chi tiết để tôi hỗ trợ!';
    }

    if (
      messageLower.includes("chế độ tối") ||
      messageLower.includes("dark mode") ||
      messageLower.includes("giao diện sáng")
    ) {
      return "Về chế độ tối (Dark Mode):\n\n⚠️ Hiện tại chưa có Dark Mode\n\n💡 Bạn có thể:\n   • Điều chỉnh độ sáng màn hình\n   • Sử dụng extension trình duyệt\n   • Hoặc đề xuất Admin phát triển tính năng này\n\n🌙 Dark Mode sẽ giúp:\n   • Giảm mỏi mắt khi dùng ban đêm\n   • Tiết kiệm pin (màn hình OLED)\n   • Trải nghiệm tốt hơn\n\nBạn muốn đề xuất tính năng này không?";
    }

    if (
      messageLower.includes("đổi ngôn ngữ") ||
      messageLower.includes("tiếng anh") ||
      messageLower.includes("ngôn ngữ")
    ) {
      return "Về đổi ngôn ngữ:\n\n⚠️ Hiện tại hệ thống chỉ hỗ trợ Tiếng Việt\n\n💡 Bạn có thể:\n   • Sử dụng trình dịch của trình duyệt\n   • Hoặc đề xuất Admin phát triển đa ngôn ngữ\n\n🌐 Đa ngôn ngữ sẽ giúp:\n   • Sinh viên quốc tế sử dụng dễ dàng\n   • Mở rộng cộng đồng\n   • Trải nghiệm tốt hơn\n\nBạn muốn đề xuất tính năng này không?";
    }

    if (
      messageLower.includes("mạng ổn mà không truy cập được") ||
      messageLower.includes("không truy cập được web")
    ) {
      return "Nếu mạng vẫn ổn mà không truy cập được web:\n\n💡 Hãy thử:\n   1️⃣ Làm mới trang (F5)\n   2️⃣ Xóa cache trình duyệt\n   3️⃣ Thử trình duyệt khác\n   4️⃣ Kiểm tra server có đang hoạt động không\n   5️⃣ Liên hệ Admin nếu vẫn không được\n\n🔍 Có thể do:\n   • Server đang bảo trì\n   • Lỗi kết nối tạm thời\n   • Vấn đề với DNS\n\nBạn đã thử các cách trên chưa?";
    }

    if (
      messageLower.includes("bản quyền tài liệu") ||
      messageLower.includes("quy định bản quyền")
    ) {
      return 'Về quy định bản quyền tài liệu:\n\n📜 Tài liệu chia sẻ phải tuân thủ bản quyền\n❌ Không được chia sẻ tài liệu vi phạm bản quyền\n\n💡 Xem chi tiết trong:\n   • "Quy định sử dụng" (nếu có)\n   • Hoặc liên hệ Admin\n\n⚠️ Lưu ý:\n   • Chỉ chia sẻ tài liệu bạn có quyền\n   • Tôn trọng tác giả\n   • Báo cáo nếu phát hiện vi phạm\n\nBạn có câu hỏi gì về bản quyền không?';
    }

    if (
      messageLower.includes("đánh giá ứng dụng") ||
      messageLower.includes("feedback") ||
      messageLower.includes("góp ý")
    ) {
      return 'Để đánh giá/feedback về ứng dụng:\n\n1️⃣ Liên hệ Admin để gửi feedback\n2️⃣ Hoặc gửi email phản hồi\n3️⃣ Hoặc đề xuất trong phần "Góp ý" (nếu có)\n\n💡 Feedback của bạn rất quan trọng:\n   • Giúp cải thiện hệ thống\n   • Phát triển tính năng mới\n   • Sửa lỗi\n\nBạn có góp ý gì về hệ thống không?';
    }

    // Câu hỏi về liên hệ hỗ trợ
    if (
      messageLower.includes("liên hệ") ||
      messageLower.includes("contact") ||
      messageLower.includes("hỗ trợ") ||
      messageLower.includes("help desk")
    ) {
      return "Liên hệ hỗ trợ:\n\n👨‍💼 Admin hệ thống:\n   • Qua hệ thống: Tìm Admin trong danh sách người dùng\n   • Gửi tin nhắn trực tiếp\n\n📧 Phòng IT/Quản trị:\n   • Liên hệ phòng IT của trường\n   • Email: it@dnu.edu.vn (ví dụ)\n\n💬 Chat với tôi:\n   • Tôi có thể hỗ trợ các câu hỏi về sử dụng hệ thống\n   • Nếu không giải quyết được, tôi sẽ hướng dẫn bạn liên hệ Admin\n\nBạn cần hỗ trợ về vấn đề gì?";
    }

    // Câu trả lời mặc định - cải thiện
    const responses = [
      `Tôi hiểu bạn đang hỏi về "${userMessage}". Để tôi có thể hỗ trợ tốt hơn, bạn có thể:\n\n1. Hỏi cụ thể hơn về vấn đề\n2. Hoặc hỏi về một trong các chủ đề:\n   📝 Đăng bài viết\n   👥 Nhóm học tập\n   📅 Sự kiện\n   💬 Tin nhắn\n   ⚙️ Quản lý tài khoản\n   🔍 Tìm kiếm\n\nBạn muốn tìm hiểu về chủ đề nào?`,
      `Xin chào! Tôi chưa hiểu rõ câu hỏi "${userMessage}" của bạn. 😊\n\nTôi có thể giúp bạn với:\n\n✅ Hướng dẫn sử dụng hệ thống\n✅ Quản lý tài khoản\n✅ Đăng bài và chia sẻ tài liệu\n✅ Tham gia nhóm và sự kiện\n✅ Chat và tin nhắn\n✅ Tìm kiếm thông tin\n✅ Báo cáo và thông báo\n\nBạn muốn hỏi về chủ đề nào?`,
      `Cảm ơn bạn đã hỏi! Về "${userMessage}", tôi cần thêm thông tin để hỗ trợ tốt hơn.\n\nBạn có thể:\n• Mô tả chi tiết hơn vấn đề\n• Hoặc hỏi về các tính năng cụ thể:\n  📝 Đăng bài\n  👥 Nhóm\n  📅 Sự kiện\n  💬 Chat\n  ⚙️ Cài đặt\n\nTôi sẵn sàng hỗ trợ bạn! 😊`,
      `Tôi đang cố gắng hiểu câu hỏi "${userMessage}" của bạn. Hiện tại tôi có thể hỗ trợ về:\n\n🎯 Các tính năng hệ thống:\n   • Đăng bài, tài liệu\n   • Nhóm học tập\n   • Sự kiện\n   • Chat tin nhắn\n   • Quản lý tài khoản\n\n🔧 Khắc phục sự cố:\n   • Lỗi đăng nhập\n   • Lỗi upload file\n   • Lỗi hiển thị\n\nBạn có thể hỏi cụ thể hơn không? Tôi sẽ cố gắng giúp bạn! 😊`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Add user message
    const userMsg = {
      id: Date.now(),
      type: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentMessage = inputMessage.trim();
    setInputMessage("");
    setIsTyping(true);

    try {
      // Prepare conversation history (last 10 messages)
      const conversationHistory = messages.slice(-10).map((msg) => ({
        type: msg.type,
        content: msg.content,
      }));

      // Call AI API
      // Note: studyMaterial can be added in the future for DNU Buddy mode
      const res = await api.post("/ai/chat", {
        message: currentMessage,
        conversationHistory: conversationHistory,
        studyMaterial: null, // Can be set when user provides study material
      });

      if (res.data.success) {
        const aiMsg = {
          id: Date.now() + 1,
          type: "ai",
          content: res.data.message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(res.data.message || "Lỗi khi xử lý câu hỏi");
      }
    } catch (error) {
      console.error("Error calling AI API:", error);
      // Fallback to local response if API fails
      const aiResponse = generateAIResponse(currentMessage);
      const aiMsg = {
        id: Date.now() + 1,
        type: "ai",
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        type: "ai",
        content:
          "Chào bạn! 😊 Mình là trợ lý học tập của DNU Social. Mình ở đây để hỗ trợ bạn trong việc học tập và sử dụng hệ thống. Bạn cần mình giúp gì hôm nay? 💪",
        timestamp: new Date(),
      },
    ]);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Listen for openChatAI event from sidebar
  useEffect(() => {
    const handleOpenChatAI = () => {
      setIsOpen(true);
    };

    window.addEventListener("openChatAI", handleOpenChatAI);
    return () => window.removeEventListener("openChatAI", handleOpenChatAI);
  }, []);

  return (
    <>
      {/* Floating Button - Hidden, using sidebar buttons instead */}
      {false && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="chat-ai-button-fixed bottom-28 right-4 sm:bottom-28 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center group"
          aria-label="Chat với AI"
        >
          <Bot className="w-6 h-6 sm:w-7 sm:h-7" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>

          {/* Tooltip */}
          <div className="hidden sm:block absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Chat với AI
            <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900"></div>
          </div>
        </button>
      )}

      {/* Chat Window - Rendered via Portal to body */}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="chat-ai-window-fixed-absolute w-[calc(100vw-2rem)] sm:w-80 h-[500px] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] rounded-xl shadow-2xl border border-[var(--fb-divider)] flex flex-col overflow-hidden"
            style={{
              position: "fixed",
              bottom: "1rem",
              right: "6.5rem",
              zIndex: 9998,
              transform: "none",
              top: "auto",
            }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Trợ lý AI</h3>
                  <p className="text-xs text-blue-100 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    <span>Đang hoạt động</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={clearChat}
                  className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                  title="Xóa lịch sử chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[var(--fb-app)]">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-2 ${
                    message.type === "user"
                      ? "flex-row-reverse space-x-reverse"
                      : ""
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === "ai"
                        ? "bg-gradient-to-r from-blue-600 to-purple-600"
                        : "bg-gray-600"
                    }`}
                  >
                    {message.type === "ai" ? (
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <UserIcon className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <div
                    className={`flex flex-col ${
                      message.type === "user" ? "items-end" : ""
                    }`}
                  >
                    <div
                      className={`max-w-[240px] px-3 py-1.5 rounded-xl ${
                        message.type === "ai"
                          ? "bg-[var(--fb-surface)] border border-[var(--fb-divider)] text-[var(--fb-text-primary)]"
                          : "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      }`}
                    >
                      <p className="text-xs whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--fb-text-secondary)] opacity-80 mt-0.5 px-1">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex items-start space-x-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-[var(--fb-surface)] border border-[var(--fb-divider)] px-3 py-2 rounded-xl">
                    <div className="flex space-x-1.5">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-[var(--fb-surface)] border-t border-[var(--fb-divider)]">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập câu hỏi..."
                  className="flex-1 px-3 py-2 border border-[var(--fb-divider)] bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[var(--fb-text-secondary)] opacity-80 mt-1.5 text-center">
                AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default ChatAI;
