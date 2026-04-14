import GroupQuestion from '../models/GroupQuestion.model.js';
import GroupAnswer from '../models/GroupAnswer.model.js';
import Group from '../models/Group.model.js';
import { createNotification } from './notification.controller.js';

// @desc    Create question
// @route   POST /api/groups/:groupId/questions
// @access  Private
export const createQuestion = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { title, content, tags, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề và nội dung không được để trống'
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Check membership
    const isMember = group.members.some(m => m.user.toString() === req.user.id);
    const isCreator = group.creator.toString() === req.user.id;

    if (!isMember && !isCreator && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn phải là thành viên của nhóm để đặt câu hỏi'
      });
    }

    const questionTags = tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(t => t) : tags) : [];

    const question = await GroupQuestion.create({
      group: groupId,
      author: req.user.id,
      title,
      content,
      tags: questionTags,
      category: category || 'Học tập'
    });

    await question.populate('author', 'name avatar');

    res.status(201).json({
      success: true,
      message: 'Đã đăng câu hỏi thành công',
      question
    });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo câu hỏi',
      error: error.message
    });
  }
};

// @desc    Get all questions in a group
// @route   GET /api/groups/:groupId/questions
// @access  Private
export const getGroupQuestions = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { category, search, sortBy = 'recent', page = 1, limit = 20 } = req.query;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Check access
    const isMember = group.members.some(m => m.user.toString() === req.user.id);
    const isCreator = group.creator.toString() === req.user.id;
    const accessType = group.settings?.accessType || (group.isPublic ? 'public' : 'private');

    if (accessType === 'private' && !isMember && !isCreator && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem câu hỏi của nhóm này'
      });
    }

    // Build query
    let query = { group: groupId };

    if (category && category !== 'Tất cả') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Sort
    let sortOption = {};
    if (sortBy === 'recent') {
      sortOption = { isPinned: -1, createdAt: -1 };
    } else if (sortBy === 'unanswered') {
      query.answersCount = 0;
      sortOption = { isPinned: -1, createdAt: -1 };
    } else if (sortBy === 'solved') {
      query.isSolved = true;
      sortOption = { isPinned: -1, updatedAt: -1 };
    } else {
      // Default to recent if sortBy is not recognized
      sortOption = { isPinned: -1, createdAt: -1 };
    }

    const questions = await GroupQuestion.find(query)
      .populate('author', 'name avatar')
      .populate('bestAnswer')
      .sort(sortOption)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const count = await GroupQuestion.countDocuments(query);

    // Add vote status for current user and calculate voteScore
    const questionsWithVotes = questions.map(q => {
      const qObj = q.toObject();
      qObj.hasUpvoted = q.upvotes.some(id => id.toString() === req.user.id);
      qObj.hasDownvoted = q.downvotes.some(id => id.toString() === req.user.id);
      qObj.voteScore = q.upvotes.length - q.downvotes.length;
      return qObj;
    });

    // Sort by popularity if needed (after calculating voteScore)
    if (sortBy === 'popular') {
      questionsWithVotes.sort((a, b) => {
        // Pinned questions first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // Then by voteScore (popularity)
        if (b.voteScore !== a.voteScore) {
          return b.voteScore - a.voteScore;
        }
        // Then by answers count
        if (b.answersCount !== a.answersCount) {
          return b.answersCount - a.answersCount;
        }
        // Finally by creation date
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page),
      questions: questionsWithVotes
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách câu hỏi',
      error: error.message
    });
  }
};

// @desc    Get single question
// @route   GET /api/groups/:groupId/questions/:id
// @access  Private
export const getQuestionById = async (req, res) => {
  try {
    const { groupId, id } = req.params;

    const question = await GroupQuestion.findById(id)
      .populate('author', 'name avatar')
      .populate('bestAnswer');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy câu hỏi'
      });
    }

    if (question.group.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Câu hỏi không thuộc nhóm này'
      });
    }

    // Increment views
    question.views += 1;
    await question.save();

    // Get answers
    const answers = await GroupAnswer.find({ question: id })
      .populate('author', 'name avatar')
      .sort({ isBestAnswer: -1, createdAt: 1 });

    const questionObj = question.toObject();
    questionObj.hasUpvoted = question.upvotes.some(id => id.toString() === req.user.id);
    questionObj.hasDownvoted = question.downvotes.some(id => id.toString() === req.user.id);
    questionObj.voteScore = question.upvotes.length - question.downvotes.length;

    // Add vote status for answers
    const answersWithVotes = answers.map(a => {
      const aObj = a.toObject();
      aObj.hasUpvoted = a.upvotes.some(id => id.toString() === req.user.id);
      aObj.hasDownvoted = a.downvotes.some(id => id.toString() === req.user.id);
      aObj.voteScore = a.upvotes.length - a.downvotes.length;
      return aObj;
    });

    res.status(200).json({
      success: true,
      question: questionObj,
      answers: answersWithVotes
    });
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy câu hỏi',
      error: error.message
    });
  }
};

// @desc    Vote question
// @route   POST /api/groups/:groupId/questions/:id/vote
// @access  Private
export const voteQuestion = async (req, res) => {
  try {
    const { groupId, id } = req.params;
    const { voteType } = req.body; // 'upvote' or 'downvote'

    const question = await GroupQuestion.findById(id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy câu hỏi'
      });
    }

    if (question.group.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Câu hỏi không thuộc nhóm này'
      });
    }

    const hasUpvoted = question.upvotes.some(id => id.toString() === req.user.id);
    const hasDownvoted = question.downvotes.some(id => id.toString() === req.user.id);

    // Remove existing votes
    question.upvotes = question.upvotes.filter(id => id.toString() !== req.user.id);
    question.downvotes = question.downvotes.filter(id => id.toString() !== req.user.id);

    // Add new vote
    if (voteType === 'upvote' && !hasUpvoted) {
      question.upvotes.push(req.user.id);
    } else if (voteType === 'downvote' && !hasDownvoted) {
      question.downvotes.push(req.user.id);
    }

    await question.save();

    res.status(200).json({
      success: true,
      message: 'Đã cập nhật vote',
      upvotes: question.upvotes.length,
      downvotes: question.downvotes.length,
      voteScore: question.upvotes.length - question.downvotes.length
    });
  } catch (error) {
    console.error('Error voting question:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi vote câu hỏi',
      error: error.message
    });
  }
};

// @desc    Create answer
// @route   POST /api/groups/:groupId/questions/:id/answers
// @access  Private
export const createAnswer = async (req, res) => {
  try {
    const { groupId, questionId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung câu trả lời không được để trống'
      });
    }

    const question = await GroupQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy câu hỏi'
      });
    }

    if (question.group.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Câu hỏi không thuộc nhóm này'
      });
    }

    const answer = await GroupAnswer.create({
      question: questionId,
      author: req.user.id,
      content: content.trim()
    });

    // Update question answers count
    question.answersCount += 1;
    await question.save();

    await answer.populate('author', 'name avatar');
    await question.populate('author', 'name');

    // Notify question author about new answer (if not answering own question)
    if (question.author.toString() !== req.user.id) {
      await createNotification({
        recipient: question.author,
        sender: req.user.id,
        type: 'answer',
        group: groupId,
        question: questionId,
        answer: answer._id,
        message: `đã trả lời câu hỏi của bạn: ${question.title}`,
        link: `/groups/${groupId}?tab=qa&question=${questionId}`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Đã trả lời câu hỏi',
      answer
    });
  } catch (error) {
    console.error('Error creating answer:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo câu trả lời',
      error: error.message
    });
  }
};

// @desc    Vote answer
// @route   POST /api/groups/:groupId/questions/:questionId/answers/:id/vote
// @access  Private
export const voteAnswer = async (req, res) => {
  try {
    const { questionId, id } = req.params;
    const { voteType } = req.body;

    const answer = await GroupAnswer.findById(id);
    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy câu trả lời'
      });
    }

    if (answer.question.toString() !== questionId) {
      return res.status(400).json({
        success: false,
        message: 'Câu trả lời không thuộc câu hỏi này'
      });
    }

    const hasUpvoted = answer.upvotes.some(id => id.toString() === req.user.id);
    const hasDownvoted = answer.downvotes.some(id => id.toString() === req.user.id);

    // Remove existing votes
    answer.upvotes = answer.upvotes.filter(id => id.toString() !== req.user.id);
    answer.downvotes = answer.downvotes.filter(id => id.toString() !== req.user.id);

    // Add new vote
    if (voteType === 'upvote' && !hasUpvoted) {
      answer.upvotes.push(req.user.id);
    } else if (voteType === 'downvote' && !hasDownvoted) {
      answer.downvotes.push(req.user.id);
    }

    await answer.save();

    res.status(200).json({
      success: true,
      message: 'Đã cập nhật vote',
      upvotes: answer.upvotes.length,
      downvotes: answer.downvotes.length,
      voteScore: answer.upvotes.length - answer.downvotes.length
    });
  } catch (error) {
    console.error('Error voting answer:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi vote câu trả lời',
      error: error.message
    });
  }
};

// @desc    Mark answer as best
// @route   POST /api/groups/:groupId/questions/:questionId/answers/:id/best
// @access  Private
export const markBestAnswer = async (req, res) => {
  try {
    const { questionId, id } = req.params;

    const question = await GroupQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy câu hỏi'
      });
    }

    // Check if user is question author or group admin
    const isAuthor = question.author.toString() === req.user.id;
    const group = await Group.findById(question.group);
    const member = group.members.find(m => m.user.toString() === req.user.id);
    const isGroupAdmin = member?.role === 'admin' || member?.role === 'moderator';
    const isCreator = group.creator.toString() === req.user.id;

    if (!isAuthor && !isGroupAdmin && !isCreator && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ tác giả câu hỏi hoặc admin mới có quyền đánh dấu câu trả lời hay nhất'
      });
    }

    const answer = await GroupAnswer.findById(id);
    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy câu trả lời'
      });
    }

    if (answer.question.toString() !== questionId) {
      return res.status(400).json({
        success: false,
        message: 'Câu trả lời không thuộc câu hỏi này'
      });
    }

    // Unmark previous best answer
    if (question.bestAnswer) {
      const previousBest = await GroupAnswer.findById(question.bestAnswer);
      if (previousBest) {
        previousBest.isBestAnswer = false;
        await previousBest.save();
      }
    }

    // Mark new best answer
    answer.isBestAnswer = true;
    await answer.save();

    question.bestAnswer = answer._id;
    question.isSolved = true;
    await question.save();

    // Notify answer author about best answer
    await answer.populate('author', 'name');
    await question.populate('author', 'name');
    if (answer.author.toString() !== req.user.id) {
      await createNotification({
        recipient: answer.author,
        sender: req.user.id,
        type: 'answer',
        group: question.group,
        question: questionId,
        answer: answer._id,
        message: `đã đánh dấu câu trả lời của bạn là hay nhất cho câu hỏi: ${question.title}`,
        link: `/groups/${question.group}?tab=qa&question=${questionId}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Đã đánh dấu câu trả lời hay nhất',
      question,
      answer
    });
  } catch (error) {
    console.error('Error marking best answer:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi đánh dấu câu trả lời hay nhất',
      error: error.message
    });
  }
};

// @desc    Delete question
// @route   DELETE /api/groups/:groupId/questions/:id
// @access  Private
export const deleteQuestion = async (req, res) => {
  try {
    const { groupId, id } = req.params;

    const question = await GroupQuestion.findById(id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy câu hỏi'
      });
    }

    if (question.group.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Câu hỏi không thuộc nhóm này'
      });
    }

    // Check permissions
    const isAuthor = question.author.toString() === req.user.id;
    const group = await Group.findById(groupId);
    const member = group.members.find(m => m.user.toString() === req.user.id);
    const isGroupAdmin = member?.role === 'admin' || member?.role === 'moderator';
    const isCreator = group.creator.toString() === req.user.id;

    if (!isAuthor && !isGroupAdmin && !isCreator && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa câu hỏi này'
      });
    }

    // Delete all answers
    await GroupAnswer.deleteMany({ question: id });

    // Delete question
    await question.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Đã xóa câu hỏi'
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa câu hỏi',
      error: error.message
    });
  }
};

