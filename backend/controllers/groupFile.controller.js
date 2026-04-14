import GroupFile from '../models/GroupFile.model.js';
import Group from '../models/Group.model.js';
import path from 'path';
import fs from 'fs';

// @desc    Upload file to group library
// @route   POST /api/groups/:groupId/files
// @access  Private
export const uploadGroupFile = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, category, tags } = req.body;

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Check if user is a member
    const isMember = group.members.some(
      m => m.user.toString() === req.user.id
    );
    const isCreator = group.creator.toString() === req.user.id;

    if (!isMember && !isCreator && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn phải là thành viên của nhóm để upload file'
      });
    }

    // Check if file was uploaded
    if (!req.uploadedFiles || req.uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn file để upload'
      });
    }

    const fileTags = tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(t => t) : tags) : [];
    const files = [];

    // Create file records for all uploaded files
    for (const uploadedFile of req.uploadedFiles) {
      const fileName = name || uploadedFile.originalname;
      
      const groupFile = await GroupFile.create({
        group: groupId,
        uploadedBy: req.user.id,
        name: fileName,
        description: description || '',
        filePath: `/uploads/files/${uploadedFile.filename}`,
        fileName: uploadedFile.originalname,
        fileSize: uploadedFile.size,
        fileType: path.extname(uploadedFile.originalname).substring(1).toLowerCase(),
        mimeType: uploadedFile.mimetype || '',
        category: category || 'Khác',
        tags: fileTags
      });

      await groupFile.populate('uploadedBy', 'name avatar');
      files.push(groupFile);
    }

    res.status(201).json({
      success: true,
      message: `Đã upload ${files.length} file thành công`,
      files: files.length === 1 ? files[0] : files,
      count: files.length
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi upload file',
      error: error.message
    });
  }
};

// @desc    Get all files in a group
// @route   GET /api/groups/:groupId/files
// @access  Private
export const getGroupFiles = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { category, search, page = 1, limit = 20 } = req.query;

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Check access
    const isMember = group.members.some(
      m => m.user.toString() === req.user.id
    );
    const isCreator = group.creator.toString() === req.user.id;
    const accessType = group.settings?.accessType || (group.isPublic ? 'public' : 'private');

    if (accessType === 'private' && !isMember && !isCreator && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem file của nhóm này'
      });
    }

    // Build query
    let query = { group: groupId, isActive: true };

    if (category && category !== 'Tất cả') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const files = await GroupFile.find(query)
      .populate('uploadedBy', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const count = await GroupFile.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page),
      files
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách file',
      error: error.message
    });
  }
};

// @desc    Download file
// @route   GET /api/groups/:groupId/files/:id/download
// @access  Private
export const downloadGroupFile = async (req, res) => {
  try {
    const { groupId, id } = req.params;

    const file = await GroupFile.findById(id);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy file'
      });
    }

    if (file.group.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'File không thuộc nhóm này'
      });
    }

    // Check access
    const group = await Group.findById(groupId);
    const isMember = group.members.some(
      m => m.user.toString() === req.user.id
    );
    const isCreator = group.creator.toString() === req.user.id;
    const accessType = group.settings?.accessType || (group.isPublic ? 'public' : 'private');

    if (accessType === 'private' && !isMember && !isCreator && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền tải file này'
      });
    }

    // Check if file exists
    const filePath = path.join(process.cwd(), file.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File không tồn tại trên server'
      });
    }

    // Update download count
    const hasDownloaded = file.downloadedBy.some(
      d => d.user.toString() === req.user.id
    );

    if (!hasDownloaded) {
      file.downloadedBy.push({
        user: req.user.id,
        downloadedAt: new Date()
      });
    }
    file.downloadCount += 1;
    await file.save();

    // Send file
    res.download(filePath, file.fileName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Lỗi tải file'
          });
        }
      }
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tải file',
      error: error.message
    });
  }
};

// @desc    Delete file
// @route   DELETE /api/groups/:groupId/files/:id
// @access  Private
export const deleteGroupFile = async (req, res) => {
  try {
    const { groupId, id } = req.params;

    const file = await GroupFile.findById(id);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy file'
      });
    }

    if (file.group.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'File không thuộc nhóm này'
      });
    }

    // Check permissions
    const group = await Group.findById(groupId);
    const member = group.members.find(
      m => m.user.toString() === req.user.id
    );
    const isCreator = group.creator.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isGroupAdmin = member?.role === 'admin' || member?.role === 'moderator';
    const isUploader = file.uploadedBy.toString() === req.user.id;

    if (!isCreator && !isAdmin && !isGroupAdmin && !isUploader) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa file này'
      });
    }

    // Delete physical file
    const filePath = path.join(process.cwd(), file.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete record
    await file.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Đã xóa file thành công'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa file',
      error: error.message
    });
  }
};

// @desc    Update file info
// @route   PUT /api/groups/:groupId/files/:id
// @access  Private
export const updateGroupFile = async (req, res) => {
  try {
    const { groupId, id } = req.params;
    const { name, description, category, tags } = req.body;

    const file = await GroupFile.findById(id);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy file'
      });
    }

    if (file.group.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'File không thuộc nhóm này'
      });
    }

    // Check permissions
    const group = await Group.findById(groupId);
    const member = group.members.find(
      m => m.user.toString() === req.user.id
    );
    const isCreator = group.creator.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isGroupAdmin = member?.role === 'admin' || member?.role === 'moderator';
    const isUploader = file.uploadedBy.toString() === req.user.id;

    if (!isCreator && !isAdmin && !isGroupAdmin && !isUploader) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa file này'
      });
    }

    // Update file info
    if (name !== undefined) file.name = name;
    if (description !== undefined) file.description = description;
    if (category !== undefined) file.category = category;
    if (tags !== undefined) {
      const fileTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
      file.tags = fileTags;
    }

    await file.save();
    await file.populate('uploadedBy', 'name avatar');

    res.status(200).json({
      success: true,
      message: 'Đã cập nhật thông tin file',
      file
    });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật file',
      error: error.message
    });
  }
};

