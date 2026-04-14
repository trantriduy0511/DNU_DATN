import Report from '../models/Report.model.js';
import Post from '../models/Post.model.js';
import Comment from '../models/Comment.model.js';
import User from '../models/User.model.js';
import Event from '../models/Event.model.js';

// @desc    Create a new report
// @route   POST /api/reports
// @access  Private
export const createReport = async (req, res) => {
  try {
    const { postId, commentId, userId, eventId, category, reason } = req.body;

    // Validate that at least one target is provided
    if (!postId && !commentId && !userId && !eventId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn đối tượng cần báo cáo'
      });
    }

    // Validate reason
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập lý do báo cáo'
      });
    }

    // Create report data
    const reportData = {
      reporter: req.user.id,
      category: category || 'Khác',
      reason: reason.trim()
    };

    // Add reported targets
    if (postId) {
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài viết'
        });
      }
      reportData.reportedPost = postId;
      reportData.reportedUser = post.author;
    }

    if (commentId) {
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bình luận'
        });
      }
      reportData.reportedComment = commentId;
      if (!reportData.reportedUser) {
        reportData.reportedUser = comment.author;
      }
    }

    if (userId && !reportData.reportedUser) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }
      reportData.reportedUser = userId;
    }

    if (eventId) {
      const event = await Event.findById(eventId).select('title organizer');
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sự kiện'
        });
      }
      reportData.reportedEvent = eventId;
      if (!reportData.reportedUser) {
        reportData.reportedUser = event.organizer;
      }
    }

    const report = await Report.create(reportData);

    res.status(201).json({
      success: true,
      message: 'Đã gửi báo cáo. Chúng tôi sẽ xem xét trong thời gian sớm nhất.',
      report
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo báo cáo',
      error: error.message
    });
  }
};

// @desc    Get all reports (admin only)
// @route   GET /api/reports
// @access  Private/Admin
export const getAllReports = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;

    let query = {};
    if (status) {
      query.status = status;
    }
    if (category) {
      query.category = category;
    }

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('reporter', 'name email avatar')
      .populate('reportedUser', 'name email avatar')
      .populate('reportedPost', 'content category')
      .populate('reportedComment', 'content')
      .populate('reportedEvent', 'title date location')
      .populate('reviewedBy', 'name');

    const total = await Report.countDocuments(query);

    res.status(200).json({
      success: true,
      reports,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách báo cáo',
      error: error.message
    });
  }
};

// @desc    Update report status (admin only)
// @route   PUT /api/reports/:id
// @access  Private/Admin
export const updateReportStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy báo cáo'
      });
    }

    report.status = status || report.status;
    report.adminNote = adminNote || report.adminNote;
    report.reviewedBy = req.user.id;
    report.reviewedAt = Date.now();

    await report.save();

    const updatedReport = await Report.findById(report._id)
      .populate('reporter', 'name email avatar')
      .populate('reportedUser', 'name email avatar')
      .populate('reportedPost', 'content category')
      .populate('reportedComment', 'content')
      .populate('reportedEvent', 'title date location')
      .populate('reviewedBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Đã cập nhật trạng thái báo cáo',
      report: updatedReport
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật báo cáo',
      error: error.message
    });
  }
};

// @desc    Delete a report (admin only)
// @route   DELETE /api/reports/:id
// @access  Private/Admin
export const deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy báo cáo'
      });
    }

    await report.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Đã xóa báo cáo'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa báo cáo',
      error: error.message
    });
  }
};





















