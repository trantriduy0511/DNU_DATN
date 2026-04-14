import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import Group from '../models/Group.model.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const createSampleGroups = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Lấy user đầu tiên làm creator (hoặc admin)
    const users = await User.find().limit(5);
    if (users.length === 0) {
      console.log('❌ Không tìm thấy user nào. Vui lòng tạo user trước.');
      process.exit(1);
    }

    const creator = users[0]; // Sử dụng user đầu tiên làm creator

    console.log('👥 Creating sample groups...');

    const sampleGroups = [
      {
        name: 'Nhóm Lập Trình Web',
        description: 'Nhóm học tập và chia sẻ kiến thức về lập trình web, bao gồm HTML, CSS, JavaScript, React, Node.js và các framework hiện đại.',
        avatar: '💻',
        creator: creator._id,
        category: 'Học tập',
        tags: ['Web Development', 'JavaScript', 'React', 'Node.js'],
        members: [
          { user: creator._id, role: 'admin' },
          ...(users.slice(1, 3).map(u => ({ user: u._id, role: 'member' })))
        ],
        status: 'approved',
        settings: {
          accessType: 'public',
          postPermission: 'all-members',
          commentPermission: 'all-members',
          allowFileUpload: true,
          allowMemberInvite: true
        }
      },
      {
        name: 'Nhóm Học Machine Learning',
        description: 'Cộng đồng học tập và nghiên cứu về Machine Learning, Deep Learning, AI tại DNU. Chia sẻ tài liệu, bài tập và dự án.',
        avatar: '🤖',
        creator: creator._id,
        category: 'Học tập',
        tags: ['Machine Learning', 'AI', 'Deep Learning', 'Python'],
        members: [
          { user: creator._id, role: 'admin' },
          ...(users.slice(1, 4).map(u => ({ user: u._id, role: 'member' })))
        ],
        status: 'approved',
        settings: {
          accessType: 'public',
          postPermission: 'all-members',
          commentPermission: 'all-members',
          allowFileUpload: true,
          allowMemberInvite: true
        }
      },
      {
        name: 'Nhóm Thiết Kế Đồ Họa',
        description: 'Nhóm dành cho những người yêu thích thiết kế đồ họa, UI/UX design. Chia sẻ portfolio, tips và tricks về design.',
        avatar: '🎨',
        creator: creator._id,
        category: 'Dự án',
        tags: ['Design', 'UI/UX', 'Photoshop', 'Figma'],
        members: [
          { user: creator._id, role: 'admin' },
          ...(users.slice(1, 2).map(u => ({ user: u._id, role: 'member' })))
        ],
        status: 'approved',
        settings: {
          accessType: 'public',
          postPermission: 'all-members',
          commentPermission: 'all-members',
          allowFileUpload: true,
          allowMemberInvite: true
        }
      },
      {
        name: 'Nhóm Học Tiếng Anh',
        description: 'Nhóm luyện tập và cải thiện kỹ năng tiếng Anh, chia sẻ tài liệu học tập, tổ chức các buổi speaking practice.',
        avatar: '📖',
        creator: creator._id,
        category: 'Học tập',
        tags: ['English', 'Language Learning', 'Speaking', 'IELTS'],
        members: [
          { user: creator._id, role: 'admin' },
          ...(users.slice(1, 3).map(u => ({ user: u._id, role: 'member' })))
        ],
        status: 'approved',
        settings: {
          accessType: 'public',
          postPermission: 'all-members',
          commentPermission: 'all-members',
          allowFileUpload: true,
          allowMemberInvite: true
        }
      },
      {
        name: 'Nhóm Dự Án Capstone',
        description: 'Nhóm hỗ trợ sinh viên làm đồ án tốt nghiệp, chia sẻ kinh nghiệm, tài liệu và hỗ trợ lẫn nhau trong quá trình làm đồ án.',
        avatar: '🎓',
        creator: creator._id,
        category: 'Dự án',
        tags: ['Capstone', 'Graduation Project', 'Research'],
        members: [
          { user: creator._id, role: 'admin' },
          ...(users.slice(1, 4).map(u => ({ user: u._id, role: 'member' })))
        ],
        status: 'approved',
        settings: {
          accessType: 'public',
          postPermission: 'all-members',
          commentPermission: 'all-members',
          allowFileUpload: true,
          allowMemberInvite: true
        }
      },
      {
        name: 'Nhóm Học Toán Rời Rạc',
        description: 'Nhóm học tập môn Toán rời rạc, giải bài tập, chia sẻ tài liệu và hỗ trợ nhau trong quá trình học tập.',
        avatar: '📐',
        creator: creator._id,
        category: 'Học tập',
        tags: ['Discrete Math', 'Mathematics', 'Study Group'],
        members: [
          { user: creator._id, role: 'admin' },
          ...(users.slice(1, 3).map(u => ({ user: u._id, role: 'member' })))
        ],
        status: 'approved',
        settings: {
          accessType: 'public',
          postPermission: 'all-members',
          commentPermission: 'all-members',
          allowFileUpload: true,
          allowMemberInvite: true
        }
      },
      {
        name: 'Nhóm Hackathon DNU',
        description: 'Nhóm tổ chức và tham gia các cuộc thi Hackathon, coding contest. Chia sẻ thông tin về các sự kiện và kinh nghiệm tham gia.',
        avatar: '🏆',
        creator: creator._id,
        category: 'Sự kiện',
        tags: ['Hackathon', 'Competition', 'Coding Contest'],
        members: [
          { user: creator._id, role: 'admin' },
          ...(users.slice(1, 4).map(u => ({ user: u._id, role: 'member' })))
        ],
        status: 'approved',
        settings: {
          accessType: 'public',
          postPermission: 'all-members',
          commentPermission: 'all-members',
          allowFileUpload: true,
          allowMemberInvite: true
        }
      },
      {
        name: 'Nhóm Startup & Innovation',
        description: 'Nhóm dành cho những người có ý tưởng khởi nghiệp, chia sẻ kinh nghiệm, tìm đồng đội và phát triển dự án startup.',
        avatar: '🚀',
        creator: creator._id,
        category: 'Dự án',
        tags: ['Startup', 'Innovation', 'Business', 'Entrepreneurship'],
        members: [
          { user: creator._id, role: 'admin' },
          ...(users.slice(1, 2).map(u => ({ user: u._id, role: 'member' })))
        ],
        status: 'approved',
        settings: {
          accessType: 'public',
          postPermission: 'all-members',
          commentPermission: 'all-members',
          allowFileUpload: true,
          allowMemberInvite: true
        }
      }
    ];

    // Tạo các nhóm
    const createdGroups = await Group.insertMany(sampleGroups);

    // Cập nhật groups cho các users
    for (const group of createdGroups) {
      for (const member of group.members) {
        await User.findByIdAndUpdate(member.user, {
          $addToSet: { groups: group._id }
        });
      }
    }

    console.log(`✅ Đã tạo ${createdGroups.length} nhóm mẫu:`);
    createdGroups.forEach((group, index) => {
      console.log(`   ${index + 1}. ${group.name} - ${group.category}`);
    });

    await mongoose.connection.close();
    console.log('✅ Đã đóng kết nối MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi tạo nhóm mẫu:', error);
    process.exit(1);
  }
};

createSampleGroups();



