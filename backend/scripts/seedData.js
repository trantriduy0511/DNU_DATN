import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import Post from '../models/Post.model.js';
import Group from '../models/Group.model.js';
import Event from '../models/Event.model.js';
import Comment from '../models/Comment.model.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Post.deleteMany({});
    await Group.deleteMany({});
    await Event.deleteMany({});
    await Comment.deleteMany({});

    // Create users
    console.log('👥 Creating users...');
    const users = await User.create([
      {
        name: 'Admin DNU',
        email: 'admin@dnu.edu.vn',
        password: 'admin123',
        role: 'admin',
        studentRole: 'Giảng viên',
        major: 'Quản trị hệ thống',
        bio: 'Quản trị viên hệ thống DNU Social'
      },
      {
        name: 'Nguyễn Văn An',
        email: 'vana@dnu.edu.vn',
        password: 'user123',
        studentRole: 'Sinh viên',
        major: 'Công nghệ thông tin',
        studentId: 'K17CNTT001',
        bio: 'Đam mê lập trình và công nghệ'
      },
      {
        name: 'Trần Thị Bảo',
        email: 'thib@dnu.edu.vn',
        password: 'user123',
        studentRole: 'Sinh viên',
        major: 'Khoa học dữ liệu',
        studentId: 'K18DS002',
        bio: 'Yêu thích Machine Learning và AI'
      },
      {
        name: 'Lê Minh Cường',
        email: 'cuonglm@dnu.edu.vn',
        password: 'user123',
        studentRole: 'Giảng viên',
        major: 'Khoa Công nghệ thông tin',
        bio: 'Giảng viên Khoa CNTT - DNU'
      },
      {
        name: 'Phạm Thu Dương',
        email: 'duongpt@dnu.edu.vn',
        password: 'user123',
        studentRole: 'Sinh viên',
        major: 'An toàn thông tin',
        studentId: 'K19ATTT003',
        bio: 'Chuyên về bảo mật và an toàn mạng'
      }
    ]);

    console.log(`✅ Created ${users.length} users`);

    // Create groups
    console.log('👥 Creating groups...');
    const groups = await Group.create([
      {
        name: 'CTDL & GT K17',
        description: 'Nhóm học tập môn Cấu trúc dữ liệu và giải thuật khóa 17',
        avatar: '📚',
        creator: users[0]._id,
        category: 'Học tập',
        members: [
          { user: users[0]._id, role: 'admin' },
          { user: users[1]._id, role: 'member' },
          { user: users[2]._id, role: 'member' }
        ]
      },
      {
        name: 'Web Development',
        description: 'Cộng đồng phát triển web tại DNU',
        avatar: '💻',
        creator: users[3]._id,
        category: 'Học tập',
        members: [
          { user: users[3]._id, role: 'admin' },
          { user: users[1]._id, role: 'member' },
          { user: users[4]._id, role: 'member' }
        ]
      },
      {
        name: 'Machine Learning DNU',
        description: 'Nghiên cứu và chia sẻ về AI & ML',
        avatar: '🤖',
        creator: users[2]._id,
        category: 'Học tập',
        members: [
          { user: users[2]._id, role: 'admin' },
          { user: users[1]._id, role: 'member' }
        ]
      },
      {
        name: 'Đồ án tốt nghiệp 2025',
        description: 'Hỗ trợ và trao đổi về đồ án tốt nghiệp',
        avatar: '🎓',
        creator: users[3]._id,
        category: 'Dự án',
        members: [
          { user: users[3]._id, role: 'admin' },
          { user: users[1]._id, role: 'member' },
          { user: users[4]._id, role: 'member' }
        ]
      }
    ]);

    console.log(`✅ Created ${groups.length} groups`);

    // Update users with groups
    await User.findByIdAndUpdate(users[1]._id, { groups: groups.map(g => g._id) });

    // Create events
    console.log('📅 Creating events...');
    const events = await Event.create([
      {
        title: 'Hackathon DNU 2025',
        description: 'Cuộc thi lập trình lớn nhất năm của DNU. Giải nhất 10 triệu đồng!',
        date: new Date('2025-11-15'),
        location: 'Hội trường A - Trường ĐH Bách Khoa',
        organizer: users[0]._id,
        category: 'Hackathon',
        participants: [users[1]._id, users[2]._id, users[4]._id],
        maxParticipants: 100
      },
      {
        title: 'Seminar: Blockchain và Cryptocurrency',
        description: 'Tìm hiểu công nghệ Blockchain và ứng dụng trong thực tế',
        date: new Date('2025-11-25'),
        location: 'Hội trường B',
        organizer: users[0]._id,
        category: 'Seminar',
        participants: [users[4]._id],
        maxParticipants: 80
      }
    ]);

    console.log(`✅ Created ${events.length} events`);

    // Create posts
    console.log('📝 Creating posts...');
    const posts = await Post.create([
      {
        author: users[1]._id,
        content: 'Xin chia sẻ tài liệu ôn tập môn Cấu trúc dữ liệu và giải thuật. Bao gồm slide bài giảng, bài tập và đề thi các năm trước. Chúc các bạn học tốt! 📚',
        category: 'Học tập',
        tags: ['CTDL', 'Ôn tập', 'IT'],
        status: 'approved',
        likes: [users[2]._id, users[3]._id]
      },
      {
        author: users[3]._id,
        content: 'Thông báo: Cuộc thi lập trình Hackathon DNU 2025 sẽ diễn ra vào ngày 15/11. Giải nhất 10 triệu đồng! Đăng ký tại phòng khoa trước 10/11. 🏆',
        category: 'Sự kiện',
        tags: ['Hackathon', 'Cuộc thi', 'Lập trình'],
        status: 'approved',
        likes: [users[1]._id, users[2]._id, users[4]._id]
      },
      {
        author: users[2]._id,
        content: 'Có ai đang học Machine Learning không? Mình đang làm đồ án về phân loại ảnh bằng CNN, có bạn nào muốn trao đổi không ạ? 🤖',
        category: 'Thảo luận',
        tags: ['ML', 'AI', 'Đồ án'],
        status: 'approved',
        likes: [users[1]._id]
      },
      {
        author: users[4]._id,
        content: 'Share tài liệu ôn thi cuối kỳ môn An toàn thông tin. Bao gồm lý thuyết và bài tập thực hành. Link: https://drive.google.com/...',
        category: 'Tài liệu',
        tags: ['ATTT', 'Ôn thi', 'Security'],
        status: 'approved',
        likes: [users[1]._id, users[2]._id]
      },
      {
        author: users[1]._id,
        content: 'Hỏi: Các bạn biết framework nào tốt để học React không? Mình đang muốn học về frontend development.',
        category: 'Thảo luận',
        tags: ['React', 'Frontend', 'Web'],
        status: 'approved',
        likes: []
      },
      {
        author: users[3]._id,
        content: 'Workshop về AI và Machine Learning sẽ được tổ chức vào ngày 20/11. Các bạn quan tâm đăng ký với mình nhé!',
        category: 'Sự kiện',
        tags: ['Workshop', 'AI', 'ML'],
        status: 'approved',
        likes: [users[2]._id]
      },
      {
        author: users[2]._id,
        content: 'Mình vừa hoàn thành project về nhận diện khuôn mặt bằng Python. Ai có hứng thú có thể xem source code trên GitHub của mình.',
        category: 'Học tập',
        tags: ['Python', 'AI', 'Project'],
        status: 'approved',
        likes: [users[1]._id, users[4]._id]
      },
      {
        author: users[4]._id,
        content: 'Tìm teammate làm đồ án về hệ thống bảo mật. Cần 2 người có kinh nghiệm về cryptography và network security.',
        category: 'Thảo luận',
        tags: ['Security', 'Đồ án', 'Teammate'],
        status: 'pending',
        likes: []
      }
    ]);

    console.log(`✅ Created ${posts.length} posts`);

    // Update user post counts
    for (const user of users) {
      const postCount = posts.filter(p => p.author.toString() === user._id.toString()).length;
      await User.findByIdAndUpdate(user._id, { postsCount: postCount });
    }

    // Create comments
    console.log('💬 Creating comments...');
    const comments = await Comment.create([
      {
        post: posts[0]._id,
        author: users[2]._id,
        content: 'Cảm ơn bạn rất nhiều! Tài liệu này rất hữu ích.'
      },
      {
        post: posts[0]._id,
        author: users[3]._id,
        content: 'Tài liệu rất chi tiết và dễ hiểu. Thanks bạn!'
      },
      {
        post: posts[1]._id,
        author: users[1]._id,
        content: 'Mình đã đăng ký rồi. Rất mong chờ sự kiện này!'
      },
      {
        post: posts[2]._id,
        author: users[1]._id,
        content: 'Mình cũng đang học ML. Mình có thể trao đổi với bạn được không?'
      },
      {
        post: posts[4]._id,
        author: users[3]._id,
        content: 'Bạn có thể thử Next.js hoặc Vite + React. Rất tốt cho người mới học.'
      }
    ]);

    // Add comments to posts
    for (const comment of comments) {
      await Post.findByIdAndUpdate(comment.post, {
        $push: { comments: comment._id }
      });
    }

    console.log(`✅ Created ${comments.length} comments`);

    console.log('\n🎉 Seed data completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   📝 Posts: ${posts.length}`);
    console.log(`   👥 Groups: ${groups.length}`);
    console.log(`   📅 Events: ${events.length}`);
    console.log(`   💬 Comments: ${comments.length}`);
    console.log('\n🔐 Login credentials:');
    console.log('   Admin: admin@dnu.edu.vn / admin123');
    console.log('   User:  vana@dnu.edu.vn / user123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();












