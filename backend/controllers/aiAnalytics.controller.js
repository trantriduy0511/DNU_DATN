import { GoogleGenerativeAI } from '@google/generative-ai';
import Post from '../models/Post.model.js';
import User from '../models/User.model.js';
import Event from '../models/Event.model.js';
import Group from '../models/Group.model.js';
import Comment from '../models/Comment.model.js';
import Message from '../models/Message.model.js';

// Helper: initialize Gemini client after .env is loaded
const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on server');
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Thu thập dữ liệu thống kê từ database
 */
const collectAnalyticsData = async (timeRange = 30) => {
  const now = new Date();
  const startDate = new Date(now.getTime() - timeRange * 24 * 60 * 60 * 1000);

  // Thống kê Posts
  const totalPosts = await Post.countDocuments();
  const postsLast30Days = await Post.countDocuments({ createdAt: { $gte: startDate } });
  const postsByCategory = await Post.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  const postsByStatus = await Post.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  const avgLikesPerPost = await Post.aggregate([
    { $project: { likesCount: { $size: '$likes' } } },
    { $group: { _id: null, avg: { $avg: '$likesCount' } } }
  ]);

  // Thống kê Users
  const totalUsers = await User.countDocuments();
  const newUsersLast30Days = await User.countDocuments({ createdAt: { $gte: startDate } });
  const usersByRole = await User.aggregate([
    { $group: { _id: '$studentRole', count: { $sum: 1 } } }
  ]);
  const usersByMajor = await User.aggregate([
    { $match: { major: { $exists: true, $ne: null } } },
    { $group: { _id: '$major', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  // Thống kê Events
  const totalEvents = await Event.countDocuments();
  const upcomingEvents = await Event.countDocuments({ 
    date: { $gte: now } 
  });
  const eventsByCategory = await Event.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  // Thống kê Groups
  const totalGroups = await Group.countDocuments();
  const activeGroups = await Group.countDocuments({ 
    members: { $exists: true, $ne: [] } 
  });

  // Thống kê Comments
  const totalComments = await Comment.countDocuments();
  const commentsLast30Days = await Comment.countDocuments({ 
    createdAt: { $gte: startDate } 
  });

  // Thống kê Messages
  const totalMessages = await Message.countDocuments();
  const messagesLast30Days = await Message.countDocuments({ 
    createdAt: { $gte: startDate } 
  });

  // Engagement metrics - Top posts by likes count
  const topPosts = await Post.aggregate([
    {
      $project: {
        title: 1,
        content: 1,
        likes: 1,
        comments: 1,
        category: 1,
        createdAt: 1,
        author: 1,
        likesCount: { $size: { $ifNull: ['$likes', []] } },
        commentsCount: { $size: { $ifNull: ['$comments', []] } }
      }
    },
    { $sort: { likesCount: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        as: 'authorInfo'
      }
    },
    {
      $unwind: {
        path: '$authorInfo',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        title: 1,
        content: 1,
        likes: 1,
        comments: 1,
        category: 1,
        createdAt: 1,
        author: {
          name: '$authorInfo.name',
          avatar: '$authorInfo.avatar'
        },
        likesCount: 1,
        commentsCount: 1
      }
    }
  ]);

  const topUsers = await User.aggregate([
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'author',
        as: 'posts'
      }
    },
    {
      $project: {
        name: 1,
        email: 1,
        studentRole: 1,
        major: 1,
        postsCount: { $size: '$posts' },
        createdAt: 1
      }
    },
    { $sort: { postsCount: -1 } },
    { $limit: 10 }
  ]);

  // Daily activity (last 7 days)
  const dailyActivity = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const posts = await Post.countDocuments({
      createdAt: { $gte: dayStart, $lte: dayEnd }
    });
    const comments = await Comment.countDocuments({
      createdAt: { $gte: dayStart, $lte: dayEnd }
    });
    const users = await User.countDocuments({
      createdAt: { $gte: dayStart, $lte: dayEnd }
    });

    dailyActivity.push({
      date: dayStart.toISOString().split('T')[0],
      posts,
      comments,
      newUsers: users
    });
  }

  return {
    overview: {
      totalPosts,
      postsLast30Days,
      totalUsers,
      newUsersLast30Days,
      totalEvents,
      upcomingEvents,
      totalGroups,
      activeGroups,
      totalComments,
      commentsLast30Days,
      totalMessages,
      messagesLast30Days,
      avgLikesPerPost: avgLikesPerPost[0]?.avg || 0
    },
    posts: {
      byCategory: postsByCategory,
      byStatus: postsByStatus
    },
    users: {
      byRole: usersByRole,
      byMajor: usersByMajor
    },
    events: {
      byCategory: eventsByCategory
    },
    engagement: {
      topPosts: topPosts.map(post => ({
        _id: post._id,
        title: post.title,
        content: post.content,
        category: post.category,
        createdAt: post.createdAt,
        author: post.author,
        likesCount: post.likesCount || 0,
        commentsCount: post.commentsCount || 0
      })),
      topUsers
    },
    dailyActivity
  };
};

/**
 * Phân tích dữ liệu bằng AI và đưa ra insights
 */
export const analyzeDataWithAI = async (req, res) => {
  try {
    const { timeRange = 30, analysisType = 'comprehensive' } = req.query;
    const user = req.user;

    // Chỉ admin mới có quyền xem analytics
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có quyền xem phân tích dữ liệu'
      });
    }

    // Thu thập dữ liệu
    let analyticsData;
    try {
      analyticsData = await collectAnalyticsData(parseInt(timeRange));
    } catch (dataError) {
      console.error('Error collecting analytics data:', dataError);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi thu thập dữ liệu phân tích',
        error: dataError.message
      });
    }

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
      // Return data without AI insights if API key is not configured
      return res.json({
        success: true,
        data: analyticsData,
        aiInsights: '⚠️ AI service chưa được cấu hình. Vui lòng cấu hình GEMINI_API_KEY trong file .env để sử dụng tính năng phân tích AI.',
        timeRange: parseInt(timeRange),
        generatedAt: new Date().toISOString()
      });
    }

    // Chuẩn bị prompt cho AI
    const dataSummary = `
DỮ LIỆU THỐNG KÊ HỆ THỐNG DNU SOCIAL (${timeRange} ngày gần nhất):

TỔNG QUAN:
- Tổng số bài viết: ${analyticsData.overview.totalPosts} (${analyticsData.overview.postsLast30Days} bài trong ${timeRange} ngày)
- Tổng số người dùng: ${analyticsData.overview.totalUsers} (${analyticsData.overview.newUsersLast30Days} người mới trong ${timeRange} ngày)
- Tổng số sự kiện: ${analyticsData.overview.totalEvents} (${analyticsData.overview.upcomingEvents} sắp diễn ra)
- Tổng số nhóm: ${analyticsData.overview.totalGroups} (${analyticsData.overview.activeGroups} nhóm đang hoạt động)
- Tổng số bình luận: ${analyticsData.overview.totalComments} (${analyticsData.overview.commentsLast30Days} trong ${timeRange} ngày)
- Tổng số tin nhắn: ${analyticsData.overview.totalMessages} (${analyticsData.overview.messagesLast30Days} trong ${timeRange} ngày)
- Trung bình lượt thích/bài viết: ${analyticsData.overview.avgLikesPerPost.toFixed(2)}

BÀI VIẾT THEO DANH MỤC:
${analyticsData.posts.byCategory.map(cat => `- ${cat._id}: ${cat.count} bài`).join('\n')}

BÀI VIẾT THEO TRẠNG THÁI:
${analyticsData.posts.byStatus.map(status => `- ${status._id}: ${status.count} bài`).join('\n')}

NGƯỜI DÙNG THEO VAI TRÒ:
${analyticsData.users.byRole.map(role => `- ${role._id || 'Chưa xác định'}: ${role.count} người`).join('\n')}

NGƯỜI DÙNG THEO CHUYÊN NGÀNH (Top 10):
${analyticsData.users.byMajor.map(major => `- ${major._id}: ${major.count} người`).join('\n')}

SỰ KIỆN THEO DANH MỤC:
${analyticsData.events.byCategory.map(cat => `- ${cat._id || 'Chưa phân loại'}: ${cat.count} sự kiện`).join('\n')}

HOẠT ĐỘNG HÀNG NGÀY (7 ngày gần nhất):
${analyticsData.dailyActivity.map(day => 
  `- ${day.date}: ${day.posts} bài viết, ${day.comments} bình luận, ${day.newUsers} người dùng mới`
).join('\n')}

TOP 5 BÀI VIẾT PHỔ BIẾN:
${analyticsData.engagement.topPosts.map((post, idx) => 
  `${idx + 1}. "${post.title || post.content?.substring(0, 50)}..." - ${post.likesCount} lượt thích, ${post.commentsCount} bình luận`
).join('\n')}

TOP 10 NGƯỜI DÙNG TÍCH CỰC:
${analyticsData.engagement.topUsers.map((user, idx) => 
  `${idx + 1}. ${user.name} (${user.studentRole || 'Sinh viên'}): ${user.postsCount} bài viết`
).join('\n')}
`;

    // Tạo prompt cho AI
    const aiPrompt = `
Bạn là chuyên gia phân tích dữ liệu cho hệ thống mạng xã hội học tập DNU Social. Hãy phân tích dữ liệu dưới đây và đưa ra:

1. **PHÂN TÍCH TỔNG QUAN:**
   - Đánh giá tình trạng hoạt động của hệ thống
   - Xu hướng tăng trưởng (tích cực/tiêu cực)
   - Điểm mạnh và điểm yếu

2. **INSIGHTS CHI TIẾT:**
   - Phân tích từng khía cạnh (bài viết, người dùng, sự kiện, nhóm)
   - Nhận xét về engagement (tương tác)
   - Đánh giá về nội dung phổ biến

3. **DỰ BÁO & KHUYẾN NGHỊ:**
   - Dự báo xu hướng trong tương lai (7-30 ngày tới)
   - Khuyến nghị cải thiện hệ thống
   - Gợi ý chiến lược tăng engagement
   - Cảnh báo các vấn đề tiềm ẩn

4. **HÀNH ĐỘNG CỤ THỂ:**
   - Danh sách ưu tiên các việc cần làm
   - Các tính năng nên phát triển
   - Các vấn đề cần giải quyết ngay

Hãy trả lời bằng tiếng Việt, rõ ràng, có cấu trúc và dễ hiểu. Sử dụng emoji phù hợp để làm nổi bật các điểm quan trọng.

DỮ LIỆU:
${dataSummary}
`;

    // Gọi AI để phân tích
    let aiInsights = '';
    try {
      // Verify API key is valid
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey || apiKey.length < 20) {
        throw new Error('API key không hợp lệ hoặc quá ngắn. Vui lòng kiểm tra lại GEMINI_API_KEY trong file .env');
      }

      const genAI = getGenAIClient();
      const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
      });

      const result = await model.generateContent(aiPrompt);
      const response = await result.response;
      aiInsights = response.text();
    } catch (aiError) {
      console.error('Error calling Gemini API:', aiError);
      
      // Provide more helpful error messages
      let errorMessage = 'Unknown error';
      if (aiError.message) {
        if (aiError.message.includes('403') || aiError.message.includes('Forbidden')) {
          errorMessage = 'API key không hợp lệ hoặc chưa được kích hoạt. Vui lòng:\n1. Kích hoạt Generative Language API tại: https://console.cloud.google.com/apis/library\n2. Tìm "Generative Language API" và click "ENABLE"\n3. Kiểm tra API key tại: https://aistudio.google.com/api-keys\n4. Restart server sau khi cập nhật';
        } else if (aiError.message.includes('401') || aiError.message.includes('Unauthorized')) {
          errorMessage = 'API key không được xác thực. Vui lòng kiểm tra lại API key trong file .env';
        } else if (aiError.message.includes('quota') || aiError.message.includes('limit')) {
          errorMessage = 'Đã vượt quá giới hạn sử dụng API. Vui lòng thử lại sau hoặc kiểm tra quota tại Google Cloud Console';
        } else {
          errorMessage = aiError.message;
        }
      }
      
      aiInsights = `⚠️ Không thể tạo phân tích AI lúc này.\n\nLỗi: ${errorMessage}\n\nDữ liệu thống kê vẫn có sẵn bên dưới.`;
    }

    res.json({
      success: true,
      data: analyticsData,
      aiInsights,
      timeRange: parseInt(timeRange),
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in AI Analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi phân tích dữ liệu. Vui lòng thử lại sau.',
      error: error.message
    });
  }
};

/**
 * Dự báo xu hướng trong tương lai
 */
export const predictTrends = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const user = req.user;

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có quyền xem dự báo'
      });
    }

    // Thu thập dữ liệu lịch sử
    const historicalData = await collectAnalyticsData(90); // 90 ngày để có đủ dữ liệu

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'AI service chưa được cấu hình'
      });
    }

    const prompt = `
Bạn là chuyên gia dự báo xu hướng. Dựa trên dữ liệu lịch sử dưới đây, hãy dự báo xu hướng cho ${days} ngày tới:

DỮ LIỆU LỊCH SỬ (90 ngày):
- Tổng bài viết: ${historicalData.overview.totalPosts}
- Bài viết trong 30 ngày gần nhất: ${historicalData.overview.postsLast30Days}
- Tổng người dùng: ${historicalData.overview.totalUsers}
- Người dùng mới trong 30 ngày: ${historicalData.overview.newUsersLast30Days}
- Hoạt động hàng ngày (7 ngày gần nhất):
${historicalData.dailyActivity.map(day => 
  `  ${day.date}: ${day.posts} bài, ${day.comments} bình luận, ${day.newUsers} người mới`
).join('\n')}

Hãy dự báo:
1. Số lượng bài viết dự kiến trong ${days} ngày tới
2. Số lượng người dùng mới dự kiến
3. Xu hướng engagement (tăng/giảm/ổn định)
4. Các danh mục nội dung sẽ phổ biến
5. Thời điểm peak activity (cao điểm hoạt động)
6. Cảnh báo các vấn đề tiềm ẩn

Trả lời bằng tiếng Việt, có cấu trúc rõ ràng.
`;

    const genAI = getGenAIClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash', // Updated to latest model
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const prediction = response.text();

    res.json({
      success: true,
      prediction,
      days: parseInt(days),
      historicalData: historicalData.overview,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in Trend Prediction:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi dự báo xu hướng',
      error: error.message
    });
  }
};

/**
 * Phân tích và đề xuất cải thiện
 */
export const getRecommendations = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có quyền xem khuyến nghị'
      });
    }

    const analyticsData = await collectAnalyticsData(30);

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'AI service chưa được cấu hình'
      });
    }

    const prompt = `
Dựa trên dữ liệu hệ thống DNU Social dưới đây, hãy đưa ra các khuyến nghị cụ thể để cải thiện hệ thống:

DỮ LIỆU:
- Tổng bài viết: ${analyticsData.overview.totalPosts}
- Bài viết chờ duyệt: ${analyticsData.posts.byStatus.find(s => s._id === 'pending')?.count || 0}
- Tổng người dùng: ${analyticsData.overview.totalUsers}
- Trung bình lượt thích/bài: ${analyticsData.overview.avgLikesPerPost.toFixed(2)}
- Tỷ lệ engagement: ${((analyticsData.overview.commentsLast30Days / analyticsData.overview.postsLast30Days) * 100).toFixed(2)}%

Hãy đưa ra:
1. **Khuyến nghị ngắn hạn** (1-2 tuần): Các việc cần làm ngay
2. **Khuyến nghị trung hạn** (1-3 tháng): Cải thiện tính năng
3. **Khuyến nghị dài hạn** (3-6 tháng): Chiến lược phát triển
4. **Ưu tiên hành động**: Danh sách ưu tiên với lý do

Trả lời bằng tiếng Việt, cụ thể và có thể thực hiện được.
`;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash', // Updated to latest model
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2048,
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const recommendations = response.text();

    res.json({
      success: true,
      recommendations,
      analyticsData: analyticsData.overview,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in Recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo khuyến nghị',
      error: error.message
    });
  }
};

