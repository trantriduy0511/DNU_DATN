import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, FileText, MessageSquare, TrendingUp, Search, Bell, Settings, LogOut, Shield, BookOpen, Calendar, Flag, X, AlertCircle, RefreshCw, MapPin, Navigation, ExternalLink, Upload, Image as ImageIcon, Clock, Eye, ThumbsUp, UserCheck, UserX, CheckCircle, XCircle, Clock as ClockIcon, Activity, Menu, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';
import { formatTimeAgo, formatDate } from '../../utils/formatTime';
import ChatAI from '../../components/ChatAI';
import AIAnalytics from './AIAnalytics';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [events, setEvents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activities, setActivities] = useState([]);
  const [reports, setReports] = useState([]);
  const [reportsPagination, setReportsPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });
  const [reportFilters, setReportFilters] = useState({
    status: '',
    category: ''
  });
  const [notifications, setNotifications] = useState([]);
  const [notificationStats, setNotificationStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showHeaderNotifications, setShowHeaderNotifications] = useState(false);
  const [headerNotifications, setHeaderNotifications] = useState([]);
  const [headerUnreadCount, setHeaderUnreadCount] = useState(0);
  const [headerNotificationsLoading, setHeaderNotificationsLoading] = useState(false);
  const [showPostDetailModal, setShowPostDetailModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [pendingPostsCount, setPendingPostsCount] = useState(0);
  const [pendingGroupsCount, setPendingGroupsCount] = useState(0);
  const [showGroupDetailModal, setShowGroupDetailModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showRejectGroupModal, setShowRejectGroupModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [groupDetailLoading, setGroupDetailLoading] = useState(false);
  const [showReportDetailModal, setShowReportDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showSendNotificationModal, setShowSendNotificationModal] = useState(false);
  const [showNotificationDetailModal, setShowNotificationDetailModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    studentRole: 'Sinh viên',
    major: '',
    studentId: '',
    role: 'user',
    bio: ''
  });
  const [notificationForm, setNotificationForm] = useState({
    recipientIds: [],
    message: '',
    type: 'admin',
    link: ''
  });
  const [notificationFilters, setNotificationFilters] = useState({
    type: '',
    isRead: '',
    recipient: '',
    startDate: '',
    endDate: ''
  });
  const [notificationSort, setNotificationSort] = useState('newest'); // newest, oldest, unread-first
  const [postFilters, setPostFilters] = useState({
    status: '',
    category: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [commentFilters, setCommentFilters] = useState({
    search: '',
    author: '',
    startDate: '',
    endDate: ''
  });
  const [selectedUsersForNotification, setSelectedUsersForNotification] = useState([]);
  const [userSearchForNotification, setUserSearchForNotification] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [systemSettings, setSystemSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [selectedItems, setSelectedItems] = useState({
    posts: [],
    users: [],
    comments: []
  });
  const [showCommentDetailModal, setShowCommentDetailModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState(null);
  const [commentsPagination, setCommentsPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });
  const [notificationsPagination, setNotificationsPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    category: 'Học thuật',
    maxParticipants: '',
    image: null
  });
  const [eventImagePreview, setEventImagePreview] = useState(null);
  
  // Auto-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());

  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const resolveAvatarUrl = (avatar, name, background = '3b82f6') => {
    if (avatar) {
      const a = String(avatar);
      if (a.startsWith('/uploads')) return `http://localhost:5000${a}`;
      return a;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${background}&color=fff`;
  };

  const withAvatarFallback = (name, background = '3b82f6') => (e) => {
    if (e.currentTarget?.dataset?.fallbackApplied) return;
    if (e.currentTarget?.dataset) e.currentTarget.dataset.fallbackApplied = '1';
    e.currentTarget.src = resolveAvatarUrl('', name, background);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);
  
  // Auto-refresh disabled: only refresh when admin clicks manual refresh.
  useEffect(() => {
    return () => {};
  }, [activeTab]);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSettingsDropdown && !event.target.closest('.settings-dropdown-container')) {
        setShowSettingsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettingsDropdown]);

  // Close header notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showHeaderNotifications && !event.target.closest('.notification-dropdown-container')) {
        setShowHeaderNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHeaderNotifications]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSearchResults && !event.target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearchResults]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Bài viết đã chuyển sang tự duyệt: không còn hàng chờ duyệt
      setPendingPostsCount(0);
      
      // Nhóm đã chuyển sang tự duyệt: không còn hàng chờ duyệt
      setPendingGroupsCount(0);

      if (activeTab === 'dashboard') {
        const [statsRes, activitiesRes] = await Promise.all([
          api.get('/admin/statistics'),
          api.get('/admin/activities')
        ]);
        setStatistics(statsRes.data.statistics);
        setActivities(activitiesRes.data.activities);
      } else if (activeTab === 'users') {
        const res = await api.get('/admin/users');
        setUsers(res.data.users);
      } else if (activeTab === 'permissions') {
        // Tab Phân quyền cũng cần danh sách user để hiển thị số lượng theo vai trò
        const res = await api.get('/admin/users', { params: { limit: 500 } });
        setUsers(res.data.users || []);
      } else if (activeTab === 'posts') {
        const params = { status: postFilters.status || 'approved' };
        if (postFilters.category) params.category = postFilters.category;
        if (postFilters.search) params.search = postFilters.search;
        if (postFilters.startDate) params.startDate = postFilters.startDate;
        if (postFilters.endDate) params.endDate = postFilters.endDate;
        
        const res = await api.get('/admin/posts', { params });
        setPosts(res.data.posts || []);
      } else if (activeTab === 'comments') {
        const params = {
          page: commentsPagination.page,
          limit: 20
        };
        if (commentFilters.search) params.search = commentFilters.search;
        if (commentFilters.author) params.author = commentFilters.author;
        if (commentFilters.startDate) params.startDate = commentFilters.startDate;
        if (commentFilters.endDate) params.endDate = commentFilters.endDate;
        
        const res = await api.get('/admin/comments', { params });
        setComments(res.data.comments || []);
        setCommentsPagination({
          page: res.data.currentPage || 1,
          totalPages: res.data.totalPages || 1,
          total: res.data.count || 0
        });
      } else if (activeTab === 'events') {
        const res = await api.get('/admin/events');
        setEvents(res.data.events);
      } else if (activeTab === 'groups') {
        const [approvedRes, rejectedRes, pendingRes] = await Promise.all([
          api.get('/groups', { params: { status: 'approved' } }),
          api.get('/groups', { params: { status: 'rejected' } }),
          api.get('/groups', { params: { status: 'pending' } })
        ]);
        const normalizedGroups = [
          ...(pendingRes.data.groups || []),
          ...(approvedRes.data.groups || []),
          ...(rejectedRes.data.groups || [])
        ].map((group) => ({
          ...group,
          // Dữ liệu cũ "pending" được xem là đang còn hoạt động theo chính sách mới.
          status: group.status === 'pending' ? 'approved' : group.status
        }));
        setGroups(normalizedGroups);
      } else if (activeTab === 'notifications') {
        const params = {
          page: notificationsPagination.page,
          limit: 50
        };
        if (notificationFilters.type) params.type = notificationFilters.type;
        if (notificationFilters.isRead !== '') params.isRead = notificationFilters.isRead;
        if (notificationFilters.recipient) params.recipient = notificationFilters.recipient;
        if (notificationFilters.startDate) params.startDate = notificationFilters.startDate;
        if (notificationFilters.endDate) params.endDate = notificationFilters.endDate;

        const [notificationsRes, statsRes] = await Promise.all([
          api.get('/admin/notifications', { params }),
          api.get('/admin/notifications/statistics', { 
            params: { 
              startDate: notificationFilters.startDate, 
              endDate: notificationFilters.endDate 
            } 
          })
        ]);
        setNotifications(notificationsRes.data.notifications || []);
        setNotificationStats(statsRes.data.statistics || null);
        if (notificationsRes.data.pagination) {
          setNotificationsPagination({
            page: notificationsRes.data.pagination.page || 1,
            totalPages: notificationsRes.data.pagination.totalPages || 1,
            total: notificationsRes.data.pagination.total || 0
          });
        }
      } else if (activeTab === 'settings') {
        const res = await api.get('/admin/settings');
        setSystemSettings(res.data.settings);
      } else if (activeTab === 'reports') {
        try {
          const params = {
            page: reportsPagination.page,
            limit: 20
          };
          if (reportFilters.status) params.status = reportFilters.status;
          if (reportFilters.category) params.category = reportFilters.category;
          
          const res = await api.get('/reports', { params });
          setReports(res.data.reports || []);
          setReportsPagination({
            page: res.data.page || 1,
            totalPages: res.data.pages || 1,
            total: res.data.total || 0
          });
        } catch (error) {
          console.error('Error loading reports:', error);
          setReports([]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const fetchHeaderNotifications = async () => {
    setHeaderNotificationsLoading(true);
    try {
      const res = await api.get('/notifications', { params: { page: 1, limit: 8 } });
      setHeaderNotifications(res.data.notifications || []);
      setHeaderUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching header notifications:', error);
    } finally {
      setHeaderNotificationsLoading(false);
    }
  };

  const fetchHeaderUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setHeaderUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching unread notifications count:', error);
    }
  };

  const handleToggleHeaderNotifications = async () => {
    const nextState = !showHeaderNotifications;
    setShowHeaderNotifications(nextState);
    if (nextState) {
      await fetchHeaderNotifications();
    }
  };

  const handleHeaderNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await api.put(`/notifications/${notification._id}/read`);
      }
      await fetchHeaderNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleHeaderMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      await fetchHeaderNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    fetchHeaderUnreadCount();
    // Auto-refresh disabled: fetch again when user opens/refreshes manually.
  }, []);
  
  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setLastRefreshTime(Date.now());
    setTimeout(() => setIsRefreshing(false), 500); // Show animation for 500ms
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setShowSearchResults(true);

    let allResults = [];

    try {
      // Search users
      try {
        const usersRes = await api.get('/admin/users', { params: { search: query, limit: 5 } });
        if (usersRes.data.users) {
          allResults.push(...usersRes.data.users.map(u => ({ ...u, type: 'user' })));
        }
      } catch (error) {
        console.error('Error searching users:', error);
      }

      // Search posts
      try {
        const postsRes = await api.get('/admin/posts', { params: { search: query, limit: 5 } });
        if (postsRes.data.posts) {
          allResults.push(...postsRes.data.posts.map(p => ({ ...p, type: 'post' })));
        }
      } catch (error) {
        console.error('Error searching posts:', error);
      }

      // Search comments
      try {
        const commentsRes = await api.get('/admin/comments', { params: { search: query, limit: 5 } });
        if (commentsRes.data.comments) {
          allResults.push(...commentsRes.data.comments.map(c => ({ ...c, type: 'comment' })));
        }
      } catch (error) {
        console.error('Error searching comments:', error);
      }

      setSearchResults(allResults);
    } catch (error) {
      console.error('Error in search:', error);
      setSearchResults([]);
    }

    setSearchLoading(false);
  };

  const handleSearchResultClick = (result) => {
    setShowSearchResults(false);
    setSearchQuery('');
    
    if (result.type === 'user') {
      setActiveTab('users');
    } else if (result.type === 'post') {
      setActiveTab('posts');
    } else if (result.type === 'comment') {
      setActiveTab('comments');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!userForm.name || !userForm.email || !userForm.password) {
      alert('Vui lòng điền đầy đủ thông tin: Tên, Email và Mật khẩu');
      return;
    }

    if (userForm.password.length < 6) {
      alert('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    try {
      await api.post('/admin/users', userForm);
      alert('✅ Đã tạo người dùng thành công!');
      setShowCreateUserModal(false);
      setUserForm({
        name: '',
        email: '',
        password: '',
        studentRole: 'Sinh viên',
        major: '',
        studentId: '',
        role: 'user',
        bio: ''
      });
      fetchData();
    } catch (error) {
      alert('❌ Lỗi tạo người dùng: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      try {
        await api.delete(`/admin/users/${userId}`);
        fetchData();
      } catch (error) {
        alert('Lỗi xóa người dùng');
      }
    }
  };

  const handleUpdateUserStatus = async (userId, status) => {
    // Confirm before banning
    if (status === 'banned') {
      const confirmed = window.confirm(
        '⚠️ Bạn có chắc chắn muốn khóa tài khoản này?\n\n' +
        'Người dùng sẽ không thể đăng nhập cho đến khi bạn mở khóa.'
      );
      if (!confirmed) return;
    }

    try {
      await api.put(`/admin/users/${userId}/status`, { status });
      
      // Show success message
      if (status === 'banned') {
        alert('✅ Đã khóa tài khoản thành công!');
      } else {
        alert('✅ Đã mở khóa tài khoản thành công!');
      }
      
      fetchData();
    } catch (error) {
      alert('❌ Lỗi cập nhật trạng thái: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài viết này?')) {
      try {
        await api.delete(`/admin/posts/${postId}`);
        fetchData();
      } catch (error) {
        alert('Lỗi xóa bài viết');
      }
    }
  };

  const handleApprovePost = async (postId) => {
    try {
      await api.put(`/admin/posts/${postId}/approve`);
      setShowPostDetailModal(false);
      setSelectedPost(null);
      alert('✅ Đã duyệt bài viết thành công!');
      fetchData();
    } catch (error) {
      alert('❌ Lỗi duyệt bài viết');
    }
  };

  const handleRejectPost = async (postId) => {
    try {
      await api.put(`/admin/posts/${postId}/reject`);
      setShowPostDetailModal(false);
      setSelectedPost(null);
      alert('✅ Đã từ chối bài viết!');
      fetchData();
    } catch (error) {
      alert('❌ Lỗi từ chối bài viết');
    }
  };

  const handleFilterPosts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (postFilters.status) params.status = postFilters.status;
      if (postFilters.category) params.category = postFilters.category;
      if (postFilters.search) params.search = postFilters.search;
      if (postFilters.startDate) params.startDate = postFilters.startDate;
      if (postFilters.endDate) params.endDate = postFilters.endDate;
      
      const res = await api.get('/admin/posts', { params });
      setPosts(res.data.posts || []);
    } catch (error) {
      console.error('Error filtering posts:', error);
      alert('Lỗi lọc bài viết');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPostDetail = (post) => {
    setSelectedPost(post);
    setShowPostDetailModal(true);
  };

  const handleOpenGroupDetail = async (group) => {
    setShowGroupDetailModal(true);
    setGroupDetailLoading(true);
    
    try {
      // Fetch full group details including members and posts
      const res = await api.get(`/groups/${group._id}`);
      setSelectedGroup(res.data.group);
    } catch (error) {
      console.error('Error fetching group details:', error);
      alert('Lỗi tải thông tin nhóm');
      setShowGroupDetailModal(false);
    }
    
    setGroupDetailLoading(false);
  };

  const handleApproveGroup = async (groupId) => {
    if (!window.confirm('Bạn có chắc muốn duyệt nhóm này?')) return;
    
    try {
      await api.put(`/admin/groups/${groupId}/approve`);
      alert('✅ Đã duyệt nhóm thành công!');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi duyệt nhóm');
    }
  };

  const handleRejectGroup = async () => {
    if (!selectedGroup) return;
    
    try {
      await api.put(`/admin/groups/${selectedGroup._id}/reject`, {
        reason: rejectReason || 'Nhóm không đáp ứng yêu cầu của hệ thống'
      });
      alert('✅ Đã từ chối nhóm!');
      setShowRejectGroupModal(false);
      setRejectReason('');
      setSelectedGroup(null);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi từ chối nhóm');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nhóm này? Tất cả bài viết trong nhóm cũng sẽ bị xóa.')) {
      try {
        await api.delete(`/groups/${groupId}`);
        alert('✅ Đã xóa nhóm thành công!');
        fetchData();
      } catch (error) {
        alert('❌ Lỗi xóa nhóm');
      }
    }
  };

  const handleFilterComments = async () => {
    setLoading(true);
    setCommentsPagination({ ...commentsPagination, page: 1 });
    try {
      const params = {
        page: 1,
        limit: 20
      };
      if (commentFilters.search) params.search = commentFilters.search;
      if (commentFilters.author) params.author = commentFilters.author;
      if (commentFilters.startDate) params.startDate = commentFilters.startDate;
      if (commentFilters.endDate) params.endDate = commentFilters.endDate;
      
      const res = await api.get('/admin/comments', { params });
      setComments(res.data.comments || []);
      setCommentsPagination({
        page: res.data.currentPage || 1,
        totalPages: res.data.totalPages || 1,
        total: res.data.count || 0
      });
    } catch (error) {
      console.error('Error filtering comments:', error);
      alert('Lỗi lọc bình luận');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeCommentsPage = async (newPage) => {
    setCommentsPagination({ ...commentsPagination, page: newPage });
    setLoading(true);
    try {
      const params = {
        page: newPage,
        limit: 20
      };
      if (commentFilters.search) params.search = commentFilters.search;
      if (commentFilters.author) params.author = commentFilters.author;
      if (commentFilters.startDate) params.startDate = commentFilters.startDate;
      if (commentFilters.endDate) params.endDate = commentFilters.endDate;
      
      const res = await api.get('/admin/comments', { params });
      setComments(res.data.comments || []);
      setCommentsPagination({
        page: res.data.currentPage || newPage,
        totalPages: res.data.totalPages || 1,
        total: res.data.count || 0
      });
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNotificationsPage = async (newPage) => {
    setNotificationsPagination({ ...notificationsPagination, page: newPage });
    setLoading(true);
    try {
      const params = {
        page: newPage,
        limit: 50
      };
      if (notificationFilters.type) params.type = notificationFilters.type;
      if (notificationFilters.isRead !== '') params.isRead = notificationFilters.isRead;
      if (notificationFilters.recipient) params.recipient = notificationFilters.recipient;
      if (notificationFilters.startDate) params.startDate = notificationFilters.startDate;
      if (notificationFilters.endDate) params.endDate = notificationFilters.endDate;

      const [notificationsRes, statsRes] = await Promise.all([
        api.get('/admin/notifications', { params }),
        api.get('/admin/notifications/statistics', { 
          params: { 
            startDate: notificationFilters.startDate, 
            endDate: notificationFilters.endDate 
          } 
        })
      ]);
      setNotifications(notificationsRes.data.notifications || []);
      setNotificationStats(statsRes.data.statistics || null);
      if (notificationsRes.data.pagination) {
        setNotificationsPagination({
          page: notificationsRes.data.pagination.page || newPage,
          totalPages: notificationsRes.data.pagination.totalPages || 1,
          total: notificationsRes.data.pagination.total || 0
        });
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) {
      try {
        await api.delete(`/admin/comments/${commentId}`);
        fetchData();
      } catch (error) {
        alert('Lỗi xóa bình luận');
      }
    }
  };

  const handleOpenEventModal = (event = null) => {
    if (event) {
      setEditingEvent(event);
      const eventDate = new Date(event.date);
      setEventForm({
        title: event.title,
        description: event.description || '',
        date: eventDate.toISOString().split('T')[0],
        time: eventDate.toTimeString().slice(0, 5),
        location: event.location || '',
        category: event.category,
        maxParticipants: event.maxParticipants || '',
        image: null
      });
      setEventImagePreview(event.image ? `http://localhost:5000${event.image}` : null);
    } else {
      setEditingEvent(null);
      setEventForm({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        category: 'Học thuật',
        maxParticipants: '',
        image: null
      });
      setEventImagePreview(null);
    }
    setShowEventModal(true);
  };

  const handleCloseEventModal = () => {
    setShowEventModal(false);
    setEditingEvent(null);
    setEventForm({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      category: 'Học thuật',
      maxParticipants: '',
      image: null
    });
    setEventImagePreview(null);
  };

  const handleEventImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước ảnh không được vượt quá 5MB');
        return;
      }
      setEventForm({ ...eventForm, image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setEventImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const openGoogleMaps = (location) => {
    if (!location) return;
    const encodedLocation = encodeURIComponent(location);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedLocation}`;
    window.open(mapsUrl, '_blank');
  };

  const handleEventFormChange = (e) => {
    setEventForm({
      ...eventForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    
    try {
      const formData = new FormData();
      formData.append('title', eventForm.title);
      formData.append('description', eventForm.description);
      
      // Combine date and time
      if (eventForm.date && eventForm.time) {
        const dateTime = new Date(`${eventForm.date}T${eventForm.time}`);
        formData.append('date', dateTime.toISOString());
      } else if (eventForm.date) {
        formData.append('date', new Date(eventForm.date).toISOString());
      }
      
      formData.append('location', eventForm.location);
      formData.append('category', eventForm.category);
      if (eventForm.maxParticipants) {
        formData.append('maxParticipants', eventForm.maxParticipants);
      }
      if (eventForm.image) {
        formData.append('image', eventForm.image);
      }

      if (editingEvent) {
        await api.put(`/events/${editingEvent._id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await api.post('/events', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      handleCloseEventModal();
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || (editingEvent ? 'Lỗi cập nhật sự kiện' : 'Lỗi tạo sự kiện'));
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sự kiện này?')) {
      try {
        await api.delete(`/admin/events/${eventId}`);
        fetchData();
      } catch (error) {
        alert('Lỗi xóa sự kiện');
      }
    }
  };

  const StatCard = ({ icon: Icon, title, value, change, color, onClick }) => (
    <div 
      onClick={onClick}
      className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          <p className={`text-sm mt-2 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% so với tháng trước
          </p>
        </div>
        <div className={`${color} p-4 rounded-full`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => {
    if (!statistics) return <div className="text-center py-8">Đang tải...</div>;

    // Transform data for charts
    const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    const userStats = statistics.usersByMonth?.map(item => ({
      month: monthNames[item._id - 1] || `T${item._id}`,
      users: item.count
    })) || [];

    const eventsStats = statistics.eventsByMonth?.map(item => ({
      month: monthNames[item._id - 1] || `T${item._id}`,
      events: item.count
    })) || [];

    const groupsStats = statistics.groupsByMonth?.map(item => ({
      month: monthNames[item._id - 1] || `T${item._id}`,
      groups: item.count
    })) || [];

    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const postStats = statistics.postsByDay?.map(item => ({
      day: dayNames[item._id - 1] || `D${item._id}`,
      posts: item.count
    })) || [];

    const categoryData = statistics.postsByCategory?.map(item => ({
      name: item._id || 'Khác',
      value: item.count
    })) || [];

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Main Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard 
            icon={Users} 
            title="Tổng người dùng" 
            value={statistics.totalUsers} 
            change={statistics.userGrowthPercent || 0} 
            color="bg-blue-500"
            onClick={() => setActiveTab('users')}
          />
          <StatCard 
            icon={FileText} 
            title="Tổng bài viết" 
            value={statistics.totalPosts} 
            change={statistics.postGrowthPercent || 0} 
            color="bg-green-500"
            onClick={() => setActiveTab('posts')}
          />
          <StatCard 
            icon={MessageSquare} 
            title="Bình luận" 
            value={statistics.totalComments} 
            change={statistics.commentGrowthPercent || 0} 
            color="bg-yellow-500"
            onClick={() => setActiveTab('comments')}
          />
          <StatCard 
            icon={BookOpen} 
            title="Nhóm" 
            value={statistics.totalGroups} 
            change={statistics.groupGrowthPercent || 0} 
            color="bg-purple-500"
            onClick={() => setActiveTab('groups')}
          />
        </div>

        {/* Secondary Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard 
            icon={Calendar} 
            title="Sự kiện" 
            value={statistics.totalEvents} 
            change={statistics.eventGrowthPercent || 0} 
            color="bg-indigo-500"
            onClick={() => setActiveTab('events')}
          />
          <StatCard 
            icon={ClockIcon} 
            title="Bài viết chờ duyệt" 
            value={statistics.pendingPosts || 0} 
            change={0} 
            color="bg-orange-500"
            onClick={() => {
              setActiveTab('posts');
              setPostFilters({ ...postFilters, status: 'pending' });
            }}
          />
          <StatCard 
            icon={ClockIcon} 
            title="Nhóm chờ duyệt" 
            value={statistics.pendingGroups || 0} 
            change={0} 
            color="bg-yellow-600"
            onClick={() => setActiveTab('groups')}
          />
          <StatCard 
            icon={UserCheck} 
            title="Người dùng hoạt động" 
            value={statistics.activeUsers || 0} 
            change={0} 
            color="bg-green-600"
            onClick={() => setActiveTab('users')}
          />
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              Trạng thái người dùng
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-gray-700">Hoạt động</span>
                </div>
                <span className="font-semibold text-gray-800">{statistics.activeUsers || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <XCircle className="w-4 h-4 text-red-500 mr-2" />
                  <span className="text-gray-700">Đã khóa</span>
                </div>
                <span className="font-semibold text-gray-800">{statistics.bannedUsers || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-gray-700">Không hoạt động</span>
                </div>
                <span className="font-semibold text-gray-800">{statistics.inactiveUsers || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-green-600" />
              Trạng thái bài viết
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-gray-700">Đã duyệt</span>
                </div>
                <span className="font-semibold text-gray-800">{statistics.approvedPosts || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ClockIcon className="w-4 h-4 text-orange-500 mr-2" />
                  <span className="text-gray-700">Chờ duyệt</span>
                </div>
                <span className="font-semibold text-gray-800">{statistics.pendingPosts || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <XCircle className="w-4 h-4 text-red-500 mr-2" />
                  <span className="text-gray-700">Đã từ chối</span>
                </div>
                <span className="font-semibold text-gray-800">{statistics.rejectedPosts || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-purple-600" />
              Trạng thái nhóm
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-gray-700">Đã duyệt</span>
                </div>
                <span className="font-semibold text-gray-800">{statistics.approvedGroups || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ClockIcon className="w-4 h-4 text-orange-500 mr-2" />
                  <span className="text-gray-700">Chờ duyệt</span>
                </div>
                <span className="font-semibold text-gray-800">{statistics.pendingGroups || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <XCircle className="w-4 h-4 text-red-500 mr-2" />
                  <span className="text-gray-700">Đã từ chối</span>
                </div>
                <span className="font-semibold text-gray-800">{statistics.rejectedGroups || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Người dùng mới theo tháng</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} name="Người dùng" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Bài viết trong tuần</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={postStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="posts" fill="#10b981" name="Bài viết" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Sự kiện theo tháng</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={eventsStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="events" stroke="#6366f1" strokeWidth={2} name="Sự kiện" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Nhóm theo tháng</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={groupsStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="groups" stroke="#a855f7" strokeWidth={2} name="Nhóm" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Phân loại bài viết</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Hoạt động gần đây
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {activities.length > 0 ? (
                activities.slice(0, 8).map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 py-2 border-b last:border-b-0">
                    <div className={`mt-1 p-1.5 rounded-full ${
                      activity.type === 'user_registration' ? 'bg-blue-100' :
                      activity.type === 'new_post' ? 'bg-green-100' :
                      'bg-yellow-100'
                    }`}>
                      {activity.type === 'user_registration' ? (
                        <Users className="w-4 h-4 text-blue-600" />
                      ) : activity.type === 'new_post' ? (
                        <FileText className="w-4 h-4 text-green-600" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{activity.user}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(activity.time)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Chưa có hoạt động nào</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Users and Top Posts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              Top 5 người dùng tích cực
            </h3>
            <div className="space-y-3">
              {statistics.topUsers && statistics.topUsers.length > 0 ? (
                statistics.topUsers.map((user, index) => (
                  <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-500' :
                        'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <img
                        src={resolveAvatarUrl(user.avatar, user.name)}
                        alt={user.name}
                        className="w-10 h-10 rounded-full"
                      />
                  <div>
                        <p className="font-medium text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.studentRole}</p>
                  </div>
                </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">{user.postsCount || 0}</p>
                      <p className="text-xs text-gray-500">bài viết</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Chưa có dữ liệu</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <ThumbsUp className="w-5 h-5 mr-2 text-green-600" />
              Top 5 bài viết được yêu thích
            </h3>
            <div className="space-y-3">
              {statistics.topPosts && statistics.topPosts.length > 0 ? (
                statistics.topPosts.map((post, index) => (
                  <div key={post._id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-500' :
                      'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm line-clamp-1">{post.title || post.content}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <img
                          src={resolveAvatarUrl(post.author?.avatar, post.author?.name)}
                          alt={post.author?.name}
                          className="w-5 h-5 rounded-full"
                          onError={withAvatarFallback(post.author?.name)}
                        />
                        <p className="text-xs text-gray-500">{post.author?.name}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center space-x-1 text-green-600">
                        <ThumbsUp className="w-4 h-4" />
                        <span className="font-semibold">{post.likes || 0}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Chưa có dữ liệu</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              Người dùng mới (7 ngày qua)
            </h3>
            <div className="space-y-3">
              {statistics.recentUsers && statistics.recentUsers.length > 0 ? (
                statistics.recentUsers.map((user) => (
                  <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{formatTimeAgo(user.createdAt)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        user.studentRole === 'Giảng viên' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.studentRole}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Chưa có người dùng mới</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-green-600" />
              Bài viết mới (7 ngày qua)
            </h3>
            <div className="space-y-3">
              {statistics.recentPosts && statistics.recentPosts.length > 0 ? (
                statistics.recentPosts.map((post) => (
                  <div key={post._id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <img
                      src={resolveAvatarUrl(post.author?.avatar, post.author?.name)}
                      alt={post.author?.name}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                      onError={withAvatarFallback(post.author?.name)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm line-clamp-1">{post.title}</p>
                      <div className="flex items-center space-x-3 mt-1">
                        <p className="text-xs text-gray-500">{post.author?.name}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <ThumbsUp className="w-3 h-3" />
                          <span>{post.likes || 0}</span>
                          <MessageSquare className="w-3 h-3 ml-2" />
                          <span>{post.comments || 0}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(post.createdAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Chưa có bài viết mới</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUsers = () => (
    <div className="space-y-4">
    <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 sm:p-6 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-xl font-semibold">Quản lý người dùng</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedItems.users.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Đã chọn: {selectedItems.users.length}</span>
                  <button
                    onClick={() => handleBulkUpdateUserStatus('active')}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Kích hoạt
                  </button>
                  <button
                    onClick={() => handleBulkUpdateUserStatus('banned')}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Khóa
                  </button>
                  <button
                    onClick={() => setSelectedItems({ ...selectedItems, users: [] })}
                    className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Bỏ chọn
                  </button>
                </div>
              )}
              <button
                onClick={() => handleExportData('users')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Xuất CSV
              </button>
          <button 
            onClick={() => setShowCreateUserModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Thêm người dùng
          </button>
            </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50">
            <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                  <input
                    type="checkbox"
                    checked={selectedItems.users.length === users.length && users.length > 0}
                    onChange={() => handleSelectAllItems('users', users.map(u => u._id))}
                    className="rounded"
                  />
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Email</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Vai trò</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Bài viết</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Ngày tham gia</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-gray-50">
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedItems.users.includes(user._id)}
                    onChange={() => handleToggleItemSelection('users', user._id)}
                    className="rounded"
                  />
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap font-medium">
                  <div>
                    <p className="font-medium text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500 sm:hidden">{user.email}</p>
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-gray-600 hidden sm:table-cell">{user.email}</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${user.studentRole === 'Giảng viên' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                    {user.studentRole}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-gray-600 hidden md:table-cell">{user.postsCount || 0}</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-gray-600 hidden lg:table-cell">{formatDate(user.createdAt)}</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.status === 'active' ? 'bg-green-100 text-green-800' : 
                    user.status === 'banned' ? 'bg-red-100 text-red-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.status === 'active' ? 'Hoạt động' : 
                     user.status === 'banned' ? 'Đã khóa' : 
                     'Không hoạt động'}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                  {user.role !== 'admin' ? (
                    <button
                      onClick={() => handleUpdateUserStatus(user._id, user.status === 'active' ? 'banned' : 'active')}
                      className={`mr-3 font-medium ${
                        user.status === 'active' 
                          ? 'text-orange-600 hover:text-orange-800' 
                          : 'text-green-600 hover:text-green-800'
                      }`}
                    >
                      {user.status === 'active' ? '🔒 Khóa' : '🔓 Mở khóa'}
                    </button>
                  ) : (
                    <span className="text-gray-400 text-sm mr-3">
                      👑 Admin
                    </span>
                  )}
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => handleDeleteUser(user._id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Xóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );

  const renderPosts = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 sm:p-6 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-xl font-semibold">Quản lý bài viết</h3>
              {posts.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Tìm thấy {posts.length} bài viết
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedItems.posts.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Đã chọn: {selectedItems.posts.length}</span>
                  <button
                    onClick={handleBulkDeletePosts}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Xóa tất cả
                  </button>
                  <button
                    onClick={() => setSelectedItems({ ...selectedItems, posts: [] })}
                    className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Bỏ chọn
                  </button>
                </div>
              )}
              <button
                onClick={() => handleExportData('posts')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
              >
                <FileText className="w-4 h-4" />
                Xuất CSV
              </button>
            <button
              onClick={() => {
                setPostFilters({
                  status: '',
                  category: '',
                  search: '',
                  startDate: '',
                  endDate: ''
                });
                setTimeout(() => handleFilterPosts(), 100);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            <input
              type="text"
              value={postFilters.search}
              onChange={(e) => setPostFilters({ ...postFilters, search: e.target.value })}
              placeholder="Tìm kiếm bài viết..."
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />

            <select
              value={postFilters.status}
              onChange={(e) => setPostFilters({ ...postFilters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Còn</option>
              <option value="approved">Còn</option>
              <option value="rejected">Đã xóa</option>
            </select>

            <select
              value={postFilters.category}
              onChange={(e) => setPostFilters({ ...postFilters, category: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Tất cả danh mục</option>
              <option value="Học tập">Học tập</option>
              <option value="Giải trí">Giải trí</option>
              <option value="Thể thao">Thể thao</option>
              <option value="Khác">Khác</option>
            </select>

            <input
              type="date"
              value={postFilters.startDate}
              onChange={(e) => setPostFilters({ ...postFilters, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Từ ngày"
            />

            <input
              type="date"
              value={postFilters.endDate}
              onChange={(e) => setPostFilters({ ...postFilters, endDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Đến ngày"
            />
          </div>

          <div className="mt-4">
            <button
              onClick={handleFilterPosts}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
            >
              <Search className="w-4 h-4" />
              Lọc
            </button>
          </div>
        </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                <input
                  type="checkbox"
                  checked={selectedItems.posts.length === posts.length && posts.length > 0}
                  onChange={() => handleSelectAllItems('posts', posts.map(p => p._id))}
                  className="rounded"
                />
              </th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiêu đề</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Tác giả</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Danh mục</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Lượt thích</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Bình luận</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Ngày đăng</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {posts.map((post) => (
              <tr key={post._id} className="hover:bg-gray-50">
                <td className="px-3 sm:px-6 py-3 sm:py-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.posts.includes(post._id)}
                    onChange={() => handleToggleItemSelection('posts', post._id)}
                    className="rounded"
                  />
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium max-w-xs truncate">
                  <div>
                    <p className="font-medium text-gray-800">{post.title || post.content.substring(0, 50) + '...'}</p>
                    <p className="text-xs text-gray-500 md:hidden mt-1">{post.author?.name}</p>
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-gray-600 hidden md:table-cell">{post.author?.name}</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                  <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {post.category}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-gray-600 hidden md:table-cell">{post.likes?.length || 0}</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-gray-600 hidden md:table-cell">{post.comments?.length || 0}</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-gray-600 hidden lg:table-cell">{formatDate(post.createdAt)}</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${post.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {post.status === 'approved' ? 'Còn' : 'Đã xóa'}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleOpenPostDetail(post)}
                    className="text-blue-600 hover:text-blue-800 mr-2 sm:mr-3 text-xs sm:text-sm font-medium"
                  >
                    👁️ Xem
                  </button>
                  <button
                    onClick={() => handleDeletePost(post._id)}
                    className="text-red-600 hover:text-red-800 text-xs sm:text-sm font-medium"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {posts.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Không tìm thấy bài viết nào</p>
            <p className="text-sm mt-1">
              {Object.values(postFilters).some(v => v) 
                ? 'Thử thay đổi bộ lọc để tìm thêm bài viết' 
                : 'Chưa có bài viết nào trong hệ thống'}
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );

  const renderEvents = () => (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Quản lý sự kiện</h3>
            <p className="text-sm text-gray-500 mt-1">Tạo và quản lý các sự kiện cho sinh viên</p>
          </div>
          <button
            onClick={() => handleOpenEventModal()}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Calendar className="w-5 h-5" />
            <span>Tạo sự kiện mới</span>
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiêu đề</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày diễn ra</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Địa điểm</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Danh mục</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người tham gia</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {events.map((event) => (
              <tr key={event._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    {event.image ? (
                      <img 
                        src={`http://localhost:5000${event.image}`} 
                        alt={event.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-800">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-gray-500 line-clamp-1">{event.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(event.date).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {event.location ? (
                    <div className="flex items-center gap-2 group">
                      <MapPin className="w-4 h-4 text-red-600" />
                      <span className="group-hover:text-blue-600 transition-colors">{event.location}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openGoogleMaps(event.location);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Xem đường đi trên Google Maps"
                      >
                        <ExternalLink className="w-3 h-3 text-blue-600" />
                      </button>
                    </div>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    {event.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {event.participantsCount || 0}
                  {event.maxParticipants && ` / ${event.maxParticipants}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    event.status === 'upcoming' ? 'bg-blue-100 text-blue-800' : 
                    event.status === 'ongoing' ? 'bg-green-100 text-green-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {event.status === 'upcoming' ? 'Sắp diễn ra' : 
                     event.status === 'ongoing' ? 'Đang diễn ra' : 
                     event.status === 'completed' ? 'Đã kết thúc' : 'Đã hủy'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleOpenEventModal(event)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event._id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {events.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Chưa có sự kiện nào</p>
          <p className="text-sm mt-1">Click "Tạo sự kiện mới" để bắt đầu</p>
        </div>
      )}
    </div>
  );

  const renderGroups = () => (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b">
        <h3 className="text-xl font-semibold">Quản lý nhóm</h3>
        <p className="text-sm text-gray-500 mt-1">Danh sách các nhóm học tập và thảo luận</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên nhóm</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người tạo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Danh mục</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thành viên</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {groups.map((group) => (
              <tr key={group._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-xl">
                      {group.avatar || '📚'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{group.name}</p>
                      <p className="text-xs text-gray-500">{group.description?.substring(0, 50)}...</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{group.creator?.name || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    {group.category || 'Chung'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {group.membersCount || group.members?.length || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{formatDate(group.createdAt)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    group.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {group.status === 'approved' ? 'Còn' : 'Đã xóa'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button 
                    onClick={() => handleOpenGroupDetail(group)}
                    className="text-blue-600 hover:text-blue-800 mr-3 font-medium"
                  >
                    👁️ Xem
                  </button>
                  <button 
                    onClick={() => handleDeleteGroup(group._id)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {groups.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Chưa có nhóm nào</p>
          <p className="text-sm mt-1">Người dùng có thể tạo nhóm từ trang chủ</p>
        </div>
      )}
    </div>
  );

  const handleOpenReportDetail = (report) => {
    setSelectedReport(report);
    setShowReportDetailModal(true);
  };

  const handleUpdateReportStatus = async (reportId, status, adminNote = '') => {
    try {
      await api.put(`/reports/${reportId}`, { status, adminNote });
      alert(`✅ Đã cập nhật trạng thái báo cáo thành công!`);
      fetchData();
      setShowReportDetailModal(false);
      setSelectedReport(null);
    } catch (error) {
      console.error('Error updating report status:', error);
      alert('❌ Lỗi cập nhật trạng thái: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleResolveReport = async (reportId) => {
    if (window.confirm('Bạn có chắc chắn muốn đánh dấu báo cáo này đã xử lý?')) {
      await handleUpdateReportStatus(reportId, 'resolved');
    }
  };

  const handleDismissReport = async (reportId) => {
    if (window.confirm('Bạn có chắc chắn muốn bỏ qua báo cáo này? (dismissed)')) {
      await handleUpdateReportStatus(reportId, 'dismissed');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa báo cáo này?')) {
      try {
        await api.delete(`/reports/${reportId}`);
        alert('✅ Đã xóa báo cáo!');
        fetchData();
        setShowReportDetailModal(false);
        setSelectedReport(null);
      } catch (error) {
        console.error('Error deleting report:', error);
        alert('❌ Lỗi xóa báo cáo: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleDeleteReportedContent = async (report) => {
    const contentType = report.reportedPost ? 'bài viết' : report.reportedComment ? 'bình luận' : 'nội dung';
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${contentType} bị báo cáo này?`)) {
      try {
        if (report.reportedPost) {
          await api.delete(`/admin/posts/${report.reportedPost._id || report.reportedPost}`);
        } else if (report.reportedComment) {
          await api.delete(`/admin/comments/${report.reportedComment._id || report.reportedComment}`);
        }
        
        // Mark report as resolved after deleting content
        await handleUpdateReportStatus(report._id, 'resolved', 'Đã xóa nội dung vi phạm');
        
        alert(`✅ Đã xóa ${contentType} và đánh dấu báo cáo đã xử lý!`);
      } catch (error) {
        console.error('Error deleting content:', error);
        alert('❌ Lỗi xóa nội dung: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    // Confirm before changing to admin
    if (newRole === 'admin') {
      if (!confirm('⚠️ Bạn có chắc muốn cấp quyền Admin cho tài khoản này? Họ sẽ có toàn quyền quản trị hệ thống.')) {
        fetchData(); // Refresh to reset dropdown
        return;
      }
    }
    
    // Confirm before demoting from admin
    const user = users.find(u => u._id === userId);
    if (user && user.role === 'admin' && newRole === 'user') {
      if (!confirm('⚠️ Bạn có chắc muốn gỡ quyền Admin của tài khoản này?')) {
        fetchData(); // Refresh to reset dropdown
        return;
      }
    }
    
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      alert(`✅ Đã cập nhật vai trò hệ thống thành ${newRole === 'admin' ? 'Admin' : 'User'}`);
      fetchData();
    } catch (error) {
      console.error('Error updating user role:', error);
      alert(error.response?.data?.message || '❌ Lỗi cập nhật vai trò hệ thống');
      fetchData(); // Refresh to reset dropdown
    }
  };

  const handleSendNotification = async () => {
    if (!notificationForm.message.trim()) {
      alert('Vui lòng nhập nội dung thông báo');
      return;
    }
    
    if (notificationForm.recipientIds.length === 0) {
      alert('Vui lòng chọn ít nhất một người nhận');
      return;
    }

    try {
      await api.post('/admin/notifications', notificationForm);
      alert(`✅ Đã gửi thông báo đến ${notificationForm.recipientIds.length} người dùng!`);
      setShowSendNotificationModal(false);
      setNotificationForm({
        recipientIds: [],
        message: '',
        type: 'admin',
        link: ''
      });
      setSelectedUsersForNotification([]);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi gửi thông báo');
    }
  };

  const handleSearchUsersForNotification = async (query) => {
    setUserSearchForNotification(query);
    if (query.trim().length < 2) {
      setSearchedUsers([]);
      return;
    }

    try {
      const res = await api.get('/admin/users', { params: { search: query, limit: 10 } });
      setSearchedUsers(res.data.users || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleAddUserToNotification = (user) => {
    if (!notificationForm.recipientIds.includes(user._id)) {
      setNotificationForm({
        ...notificationForm,
        recipientIds: [...notificationForm.recipientIds, user._id]
      });
      setSelectedUsersForNotification([...selectedUsersForNotification, user]);
    }
    setUserSearchForNotification('');
    setSearchedUsers([]);
  };

  const handleRemoveUserFromNotification = (userId) => {
    setNotificationForm({
      ...notificationForm,
      recipientIds: notificationForm.recipientIds.filter(id => id !== userId)
    });
    setSelectedUsersForNotification(selectedUsersForNotification.filter(u => u._id !== userId));
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!window.confirm('Bạn có chắc muốn xóa thông báo này?')) {
      return;
    }

    try {
      await api.delete(`/admin/notifications/${notificationId}`);
      fetchData();
      alert('✅ Đã xóa thông báo');
    } catch (error) {
      alert('Lỗi xóa thông báo');
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      // Mark all unread notifications as read
      const unreadNotifications = notifications.filter(n => !n.isRead);
      if (unreadNotifications.length === 0) {
        alert('Không có thông báo chưa đọc nào');
        return;
      }

      // Call API to mark all as read (need to implement this endpoint)
      for (const notification of unreadNotifications) {
        try {
          await api.put(`/notifications/${notification._id}/read`);
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }
      }
      
      alert(`✅ Đã đánh dấu ${unreadNotifications.length} thông báo là đã đọc`);
      fetchData();
    } catch (error) {
      alert('Lỗi đánh dấu tất cả thông báo');
    }
  };

  const handleBulkDeletePosts = async () => {
    if (selectedItems.posts.length === 0) {
      alert('Vui lòng chọn ít nhất một bài viết');
      return;
    }

    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedItems.posts.length} bài viết đã chọn?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedItems.posts.map(postId => api.delete(`/admin/posts/${postId}`))
      );
      alert(`✅ Đã xóa ${selectedItems.posts.length} bài viết thành công`);
      setSelectedItems({ ...selectedItems, posts: [] });
      fetchData();
    } catch (error) {
      alert('Lỗi xóa bài viết');
    }
  };

  const handleBulkApprovePosts = async () => {
    if (selectedItems.posts.length === 0) {
      alert('Vui lòng chọn ít nhất một bài viết');
      return;
    }

    try {
      await Promise.all(
        selectedItems.posts.map(postId => api.put(`/admin/posts/${postId}/approve`))
      );
      alert(`✅ Đã duyệt ${selectedItems.posts.length} bài viết thành công`);
      setSelectedItems({ ...selectedItems, posts: [] });
      fetchData();
    } catch (error) {
      alert('Lỗi duyệt bài viết');
    }
  };

  const handleBulkDeleteComments = async () => {
    if (selectedItems.comments.length === 0) {
      alert('Vui lòng chọn ít nhất một bình luận');
      return;
    }

    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedItems.comments.length} bình luận đã chọn?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedItems.comments.map(commentId => api.delete(`/admin/comments/${commentId}`))
      );
      alert(`✅ Đã xóa ${selectedItems.comments.length} bình luận thành công`);
      setSelectedItems({ ...selectedItems, comments: [] });
      fetchData();
    } catch (error) {
      alert('Lỗi xóa bình luận');
    }
  };

  const handleBulkUpdateUserStatus = async (status) => {
    if (selectedItems.users.length === 0) {
      alert('Vui lòng chọn ít nhất một người dùng');
      return;
    }

    try {
      await Promise.all(
        selectedItems.users.map(userId => api.put(`/admin/users/${userId}/status`, { status }))
      );
      alert(`✅ Đã cập nhật trạng thái ${selectedItems.users.length} người dùng thành công`);
      setSelectedItems({ ...selectedItems, users: [] });
      fetchData();
    } catch (error) {
      alert('Lỗi cập nhật trạng thái người dùng');
    }
  };

  const handleExportData = async (type) => {
    try {
      let data = [];
      let filename = '';

      if (type === 'users') {
        const res = await api.get('/admin/users', { params: { limit: 1000 } });
        data = res.data.users.map(user => ({
          'Tên': user.name,
          'Email': user.email,
          'Vai trò hệ thống': user.role,
          'Vai trò học tập': user.studentRole,
          'Ngành học': user.major || '',
          'Mã sinh viên': user.studentId || '',
          'Số bài viết': user.postsCount || 0,
          'Trạng thái': user.status,
          'Ngày tham gia': new Date(user.createdAt).toLocaleDateString('vi-VN')
        }));
        filename = 'users_export.csv';
      } else if (type === 'posts') {
        const res = await api.get('/admin/posts', { params: { limit: 1000 } });
        data = res.data.posts.map(post => ({
          'Tiêu đề': post.title || post.content?.substring(0, 50),
          'Tác giả': post.author?.name || 'N/A',
          'Email tác giả': post.author?.email || 'N/A',
          'Danh mục': post.category || '',
          'Trạng thái': post.status,
          'Số lượt thích': post.likes?.length || 0,
          'Số bình luận': post.comments?.length || 0,
          'Ngày tạo': new Date(post.createdAt).toLocaleDateString('vi-VN')
        }));
        filename = 'posts_export.csv';
      } else if (type === 'reports') {
        const res = await api.get('/reports', { params: { limit: 1000 } });
        data = res.data.reports.map(report => ({
          'Người báo cáo': report.reporter?.name || 'N/A',
          'Email người báo cáo': report.reporter?.email || 'N/A',
          'Loại': report.reportedPost ? 'Bài viết' : report.reportedComment ? 'Bình luận' : report.reportedEvent ? 'Sự kiện' : 'Người dùng',
          'Danh mục': report.category || '',
          'Lý do': report.reason || '',
          'Trạng thái': report.status,
          'Ngày báo cáo': new Date(report.createdAt).toLocaleDateString('vi-VN')
        }));
        filename = 'reports_export.csv';
      }

      // Convert to CSV
      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n');

      // Download
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      alert(`✅ Đã xuất ${data.length} bản ghi thành công`);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Lỗi xuất dữ liệu');
    }
  };

  const handleToggleItemSelection = (type, itemId) => {
    setSelectedItems(prev => {
      const current = prev[type];
      const index = current.indexOf(itemId);
      if (index > -1) {
        return { ...prev, [type]: current.filter(id => id !== itemId) };
      } else {
        return { ...prev, [type]: [...current, itemId] };
      }
    });
  };

  const handleSelectAllItems = (type, allIds) => {
    setSelectedItems(prev => {
      if (prev[type].length === allIds.length) {
        return { ...prev, [type]: [] };
      } else {
        return { ...prev, [type]: [...allIds] };
      }
    });
  };

  const handleOpenCommentDetail = (comment) => {
    setSelectedComment(comment);
    setShowCommentDetailModal(true);
  };

  const handleFilterNotifications = async () => {
    setLoading(true);
    try {
      const params = {};
      if (notificationFilters.type) params.type = notificationFilters.type;
      if (notificationFilters.isRead !== '') params.isRead = notificationFilters.isRead;
      if (notificationFilters.recipient) params.recipient = notificationFilters.recipient;
      if (notificationFilters.startDate) params.startDate = notificationFilters.startDate;
      if (notificationFilters.endDate) params.endDate = notificationFilters.endDate;

      const [notificationsRes, statsRes] = await Promise.all([
        api.get('/admin/notifications', { params: { ...params, limit: 100 } }),
        api.get('/admin/notifications/statistics', { params: { startDate: notificationFilters.startDate, endDate: notificationFilters.endDate } })
      ]);
      setNotifications(notificationsRes.data.notifications || []);
      setNotificationStats(statsRes.data.statistics || null);
    } catch (error) {
      console.error('Error filtering notifications:', error);
    }
    setLoading(false);
  };

  const renderNotifications = () => (
    // Dùng cùng khung max-w-7xl bên ngoài như các tab khác để thống nhất layout
    <div className="space-y-6">
      {/* Statistics Cards */}
      {notificationStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Tổng thông báo</p>
                <p className="text-2xl md:text-3xl font-bold mt-2">{notificationStats.total || 0}</p>
              </div>
              <Bell className="w-8 h-8 md:w-10 md:h-10 text-blue-500 flex-shrink-0" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Chưa đọc</p>
                <p className="text-2xl md:text-3xl font-bold mt-2 text-orange-600">{notificationStats.unread || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-orange-500 flex-shrink-0" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Đã đọc</p>
                <p className="text-2xl md:text-3xl font-bold mt-2 text-green-600">{notificationStats.read || 0}</p>
              </div>
              <Bell className="w-8 h-8 md:w-10 md:h-10 text-green-500 flex-shrink-0" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Tỷ lệ đọc</p>
                <p className="text-2xl md:text-3xl font-bold mt-2 text-purple-600">
                  {notificationStats.total > 0 
                    ? Math.round((notificationStats.read / notificationStats.total) * 100) 
                    : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 md:w-10 md:h-10 text-purple-500 flex-shrink-0" />
            </div>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-semibold">Quản lý thông báo</h3>
            {notificationStats && (
              <p className="mt-1 text-xs text-gray-500">
                Tổng cộng <span className="font-semibold">{notificationStats.total}</span> thông báo •{' '}
                <span className="text-orange-600 font-semibold">{notificationStats.unread}</span> chưa đọc
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleMarkAllNotificationsAsRead}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Đánh dấu tất cả đã đọc</span>
            </button>
          <button
            onClick={() => setShowSendNotificationModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <Bell className="w-5 h-5" />
            <span>Gửi thông báo</span>
          </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
          <select
            value={notificationFilters.type}
            onChange={(e) => setNotificationFilters({ ...notificationFilters, type: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả loại</option>
            <option value="comment">Bình luận</option>
            <option value="like">Thích</option>
            <option value="message">Tin nhắn</option>
            <option value="friend_request">Bạn bè</option>
            <option value="group">Nhóm</option>
            <option value="event">Sự kiện</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={notificationFilters.isRead}
            onChange={(e) => setNotificationFilters({ ...notificationFilters, isRead: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả</option>
            <option value="false">Chưa đọc</option>
            <option value="true">Đã đọc</option>
          </select>

          <input
            type="text"
            value={notificationFilters.recipient}
            onChange={(e) => setNotificationFilters({ ...notificationFilters, recipient: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Email người nhận"
          />

          <input
            type="date"
            value={notificationFilters.startDate}
            onChange={(e) => setNotificationFilters({ ...notificationFilters, startDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Từ ngày"
          />

          <input
            type="date"
            value={notificationFilters.endDate}
            onChange={(e) => setNotificationFilters({ ...notificationFilters, endDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Đến ngày"
          />

          <button
            onClick={handleFilterNotifications}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Lọc
          </button>
          <select
            value={notificationSort}
            onChange={(e) => setNotificationSort(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Mới nhất trước</option>
            <option value="oldest">Cũ nhất trước</option>
            <option value="unread-first">Ưu tiên chưa đọc</option>
          </select>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-[170px] px-4 md:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người gửi</th>
                <th className="w-[170px] px-4 md:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Người nhận</th>
                <th className="w-[250px] px-4 md:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nội dung</th>
                <th className="w-[110px] px-4 md:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                <th className="w-[110px] px-4 md:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Trạng thái</th>
                <th className="w-[120px] px-4 md:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">Thời gian</th>
                <th className="w-[140px] px-4 md:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky right-0 bg-gray-50 z-10 shadow-[-6px_0_8px_-8px_rgba(0,0,0,0.25)]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {notifications
                .slice()
                .sort((a, b) => {
                  if (notificationSort === 'oldest') {
                    return new Date(a.createdAt) - new Date(b.createdAt);
                  }
                  if (notificationSort === 'unread-first') {
                    if (a.isRead === b.isRead) {
                      return new Date(b.createdAt) - new Date(a.createdAt);
                    }
                    return a.isRead ? 1 : -1;
                  }
                  // default: newest
                  return new Date(b.createdAt) - new Date(a.createdAt);
                })
                .map((notification) => (
                <tr key={notification._id} className="hover:bg-gray-50">
                  <td className="px-4 md:px-5 py-4">
                    <div className="flex items-center min-w-[150px]">
                      <img
                        src={resolveAvatarUrl(notification.sender?.avatar, notification.sender?.name)}
                        alt={notification.sender?.name}
                        className="w-8 h-8 rounded-full mr-2 md:mr-3 flex-shrink-0"
                        onError={withAvatarFallback(notification.sender?.name)}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{notification.sender?.name || 'System'}</p>
                        <p className="text-xs text-gray-500 truncate hidden sm:block">{notification.sender?.email || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-5 py-4 hidden lg:table-cell">
                    <div className="flex items-center min-w-[150px]">
                      <img
                        src={resolveAvatarUrl(notification.recipient?.avatar, notification.recipient?.name)}
                        alt={notification.recipient?.name}
                        className="w-8 h-8 rounded-full mr-2 md:mr-3 flex-shrink-0"
                        onError={withAvatarFallback(notification.recipient?.name)}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{notification.recipient?.name || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{notification.recipient?.email || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-5 py-4">
                    <div className="max-w-[250px]">
                      <p className="text-sm text-gray-700 line-clamp-2 break-words">{notification.message}</p>
                      {/* Show recipient on mobile */}
                      <div className="lg:hidden mt-2 flex items-center text-xs text-gray-500">
                        <span className="truncate">→ {notification.recipient?.name || 'User'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-5 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      notification.type === 'admin' ? 'bg-purple-100 text-purple-800' :
                      notification.type === 'message' ? 'bg-blue-100 text-blue-800' :
                      notification.type === 'comment' ? 'bg-green-100 text-green-800' :
                      notification.type === 'like' ? 'bg-red-100 text-red-800' :
                      notification.type === 'friend_request' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {notification.type === 'admin' ? 'Admin' :
                       notification.type === 'message' ? 'Tin nhắn' :
                       notification.type === 'comment' ? 'Bình luận' :
                       notification.type === 'like' ? 'Thích' :
                       notification.type === 'friend_request' ? 'Kết bạn' :
                       notification.type === 'group' ? 'Nhóm' :
                       notification.type === 'event' ? 'Sự kiện' :
                       notification.type}
                    </span>
                  </td>
                  <td className="px-4 md:px-5 py-4 hidden md:table-cell">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      notification.isRead ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {notification.isRead ? 'Đã đọc' : 'Chưa đọc'}
                    </span>
                  </td>
                  <td className="px-4 md:px-5 py-4 hidden xl:table-cell text-sm text-gray-600">
                    <div className="whitespace-nowrap">
                      <p>{formatTimeAgo(notification.createdAt)}</p>
                      <p className="text-xs text-gray-400">{formatDate(notification.createdAt)}</p>
                    </div>
                  </td>
                  <td className="px-4 md:px-5 py-4 sticky right-0 bg-white z-[1] shadow-[-6px_0_8px_-8px_rgba(0,0,0,0.25)]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedNotification(notification);
                          setShowNotificationDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium whitespace-nowrap"
                        title="Xem chi tiết"
                      >
                        👁️ Xem
                      </button>
                      <button
                        onClick={() => handleDeleteNotification(notification._id)}
                        className="text-red-600 hover:text-red-800 text-xs sm:text-sm font-medium whitespace-nowrap"
                      >
                        Xóa
                      </button>
                      {/* Show status and time on mobile */}
                      <div className="xl:hidden text-xs text-gray-500 sm:hidden">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          notification.isRead ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {notification.isRead ? 'Đã đọc' : 'Chưa đọc'}
                        </span>
                        <p className="mt-1">{formatTimeAgo(notification.createdAt)}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {notifications.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <Bell className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Chưa có thông báo nào</p>
            <p className="text-sm mt-1">Thông báo sẽ hiển thị ở đây</p>
          </div>
        )}
        
        {/* Pagination */}
        {notificationsPagination.totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Trang {notificationsPagination.page} / {notificationsPagination.totalPages} ({notificationsPagination.total} thông báo)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleChangeNotificationsPage(notificationsPagination.page - 1)}
                disabled={notificationsPagination.page === 1}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <button
                onClick={() => handleChangeNotificationsPage(notificationsPagination.page + 1)}
                disabled={notificationsPagination.page >= notificationsPagination.totalPages}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const handleFilterReports = async () => {
    setReportsPagination({ ...reportsPagination, page: 1 }); // Reset to page 1 when filtering
    setLoading(true);
    try {
      const params = {
        page: 1,
        limit: 20
      };
      if (reportFilters.status) params.status = reportFilters.status;
      if (reportFilters.category) params.category = reportFilters.category;
      
      const res = await api.get('/reports', { params });
      setReports(res.data.reports || []);
      setReportsPagination({
        page: res.data.page || 1,
        totalPages: res.data.pages || 1,
        total: res.data.total || 0
      });
    } catch (error) {
      console.error('Error filtering reports:', error);
    }
    setLoading(false);
  };

  const handleChangeReportsPage = async (newPage) => {
    setReportsPagination({ ...reportsPagination, page: newPage });
    setLoading(true);
    try {
      const params = {
        page: newPage,
        limit: 20
      };
      if (reportFilters.status) params.status = reportFilters.status;
      if (reportFilters.category) params.category = reportFilters.category;
      
      const res = await api.get('/reports', { params });
      setReports(res.data.reports || []);
      setReportsPagination({
        page: res.data.page || newPage,
        totalPages: res.data.pages || 1,
        total: res.data.total || 0
      });
    } catch (error) {
      console.error('Error loading reports:', error);
    }
    setLoading(false);
  };

  const renderReports = () => {
    const pendingCount = reports.filter(r => r.status === 'pending').length;
    const resolvedCount = reports.filter(r => r.status === 'resolved').length;
    const reviewedCount = reports.filter(r => r.status === 'reviewed').length;
    const dismissedCount = reports.filter(r => r.status === 'dismissed').length;

    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Tổng báo cáo</p>
                <p className="text-3xl font-bold mt-2">{reportsPagination.total}</p>
              </div>
              <Flag className="w-10 h-10 text-orange-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Chờ xử lý</p>
                <p className="text-3xl font-bold mt-2 text-orange-600">{pendingCount}</p>
              </div>
              <Flag className="w-10 h-10 text-orange-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Đã xử lý</p>
                <p className="text-3xl font-bold mt-2 text-green-600">{resolvedCount}</p>
              </div>
              <Flag className="w-10 h-10 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Đã bỏ qua</p>
                <p className="text-3xl font-bold mt-2 text-gray-600">{dismissedCount}</p>
              </div>
              <Flag className="w-10 h-10 text-gray-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Bộ lọc</h3>
            <button
              onClick={() => {
                setReportFilters({ status: '', category: '' });
                setReportsPagination({ ...reportsPagination, page: 1 });
                setTimeout(() => handleFilterReports(), 100);
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Xóa bộ lọc
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái
              </label>
              <select
                value={reportFilters.status}
                onChange={(e) => setReportFilters({ ...reportFilters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả</option>
                <option value="pending">Chờ xử lý</option>
                <option value="reviewed">Đã xem xét</option>
                <option value="resolved">Đã xử lý</option>
                <option value="dismissed">Đã bỏ qua</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Danh mục
              </label>
              <select
                value={reportFilters.category}
                onChange={(e) => setReportFilters({ ...reportFilters, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả</option>
                <option value="Spam">Spam</option>
                <option value="Nội dung không phù hợp">Nội dung không phù hợp</option>
                <option value="Quấy rối">Quấy rối</option>
                <option value="Thông tin sai lệch">Thông tin sai lệch</option>
                <option value="Ngôn từ gây thù ghét">Ngôn từ gây thù ghét</option>
                <option value="Sự kiện">Sự kiện</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFilterReports}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Áp dụng bộ lọc
              </button>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-4 sm:p-6 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
            <h3 className="text-xl font-semibold">Danh sách báo cáo</h3>
            <p className="text-sm text-gray-500 mt-1">Quản lý các báo cáo vi phạm từ người dùng</p>
              </div>
              <button
                onClick={() => handleExportData('reports')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
              >
                <FileText className="w-4 h-4" />
                Xuất CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Người báo cáo</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Đối tượng bị báo cáo</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Loại</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Danh mục</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Lý do</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Thời gian</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.map((report) => {
                  const reportType = report.reportedPost ? 'post' : report.reportedComment ? 'comment' : report.reportedEvent ? 'event' : 'user';
                  return (
                    <tr key={report._id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={resolveAvatarUrl(report.reporter?.avatar, report.reporter?.name)}
                            alt={report.reporter?.name}
                            className="w-8 h-8 rounded-full mr-2"
                            onError={withAvatarFallback(report.reporter?.name)}
                          />
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{report.reporter?.name || 'N/A'}</p>
                            <p className="text-xs text-gray-500 hidden sm:block">{report.reporter?.email || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        {report.reportedUser ? (
                          <div className="flex items-center">
                            <img
                              src={resolveAvatarUrl(report.reportedUser?.avatar, report.reportedUser?.name, 'ef4444')}
                              alt={report.reportedUser?.name}
                              className="w-8 h-8 rounded-full mr-2"
                              onError={withAvatarFallback(report.reportedUser?.name, 'ef4444')}
                            />
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{report.reportedUser?.name || 'N/A'}</p>
                              <p className="text-xs text-gray-500 hidden sm:block">{report.reportedUser?.email || ''}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          reportType === 'post' ? 'bg-blue-100 text-blue-800' :
                          reportType === 'comment' ? 'bg-purple-100 text-purple-800' :
                          reportType === 'event' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {reportType === 'post' ? '📝 Bài viết' : 
                           reportType === 'comment' ? '💬 Bình luận' :
                           reportType === 'event' ? '📅 Sự kiện' : '👤 Người dùng'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
                        <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                          {report.category || 'Khác'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                        <p className="text-sm text-gray-700 max-w-xs truncate">{report.reason || 'N/A'}</p>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                        {formatTimeAgo(report.createdAt)}
                        <p className="text-xs text-gray-400">{formatDate(report.createdAt)}</p>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          report.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                          report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          report.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {report.status === 'pending' ? 'Chờ xử lý' :
                           report.status === 'resolved' ? 'Đã xử lý' :
                           report.status === 'reviewed' ? 'Đã xem xét' :
                           'Đã bỏ qua'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenReportDetail(report)}
                          className="text-blue-600 hover:text-blue-800 mr-3 text-sm font-medium"
                        >
                          👁️ Xem
                        </button>
                        {report.status === 'pending' && (
                          <button
                            onClick={() => handleOpenReportDetail(report)}
                            className="text-green-600 hover:text-green-800 mr-3 text-sm font-medium"
                          >
                            ⚙️ Xử lý
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReport(report._id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {reports.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
              <Flag className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Chưa có báo cáo nào</p>
              <p className="text-sm mt-1">Các báo cáo từ người dùng sẽ hiển thị ở đây</p>
            </div>
          )}
          
          {/* Pagination */}
          {reportsPagination.totalPages > 1 && (
            <div className="p-6 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Hiển thị {((reportsPagination.page - 1) * 20) + 1} - {Math.min(reportsPagination.page * 20, reportsPagination.total)} trong tổng số {reportsPagination.total} báo cáo
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleChangeReportsPage(reportsPagination.page - 1)}
                  disabled={reportsPagination.page === 1}
                  className={`px-4 py-2 border border-gray-300 rounded-lg ${
                    reportsPagination.page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Trước
                </button>
                <span className="px-4 py-2 text-gray-700">
                  Trang {reportsPagination.page} / {reportsPagination.totalPages}
                </span>
                <button
                  onClick={() => handleChangeReportsPage(reportsPagination.page + 1)}
                  disabled={reportsPagination.page >= reportsPagination.totalPages}
                  className={`px-4 py-2 border border-gray-300 rounded-lg ${
                    reportsPagination.page >= reportsPagination.totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleUpdateStudentRole = async (userId, newStudentRole) => {
    const user = users.find(u => u._id === userId);
    
    // Confirm when promoting to Lecturer
    if (newStudentRole === 'Giảng viên') {
      if (!confirm(`⚠️ Bạn có chắc muốn thay đổi vai trò của "${user?.name}" thành Giảng viên? Họ sẽ có quyền đăng tài liệu trong phần Tài liệu học tập.`)) {
        fetchData(); // Refresh to reset dropdown
        return;
      }
    }
    
    // Confirm when demoting to Student
    if (user && user.studentRole === 'Giảng viên' && newStudentRole === 'Sinh viên') {
      if (!confirm(`⚠️ Bạn có chắc muốn thay đổi "${user?.name}" từ Giảng viên xuống Sinh viên?`)) {
        fetchData(); // Refresh to reset dropdown
        return;
      }
    }
    
    try {
      await api.put(`/admin/users/${userId}/student-role`, { studentRole: newStudentRole });
      alert(`✅ Đã cập nhật vai trò học tập thành ${newStudentRole}`);
      fetchData();
    } catch (error) {
      console.error('Error updating student role:', error);
      alert(error.response?.data?.message || '❌ Lỗi cập nhật vai trò học tập');
      fetchData(); // Refresh to reset dropdown
    }
  };

  const renderPermissions = () => (
    <div className="space-y-6">
      {/* Role Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Quản trị viên</p>
              <p className="text-4xl font-bold mt-2">{users.filter(u => u.role === 'admin').length}</p>
              <p className="text-xs text-purple-200 mt-1">Quyền cao nhất</p>
            </div>
            <Shield className="w-12 h-12 text-purple-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Người dùng</p>
              <p className="text-4xl font-bold mt-2">{users.filter(u => u.role === 'user').length}</p>
              <p className="text-xs text-blue-200 mt-1">Quyền cơ bản</p>
            </div>
            <Users className="w-12 h-12 text-blue-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Giảng viên</p>
              <p className="text-4xl font-bold mt-2">{users.filter(u => u.studentRole === 'Giảng viên').length}</p>
              <p className="text-xs text-green-200 mt-1">Vai trò học tập</p>
            </div>
            <BookOpen className="w-12 h-12 text-green-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Sinh viên</p>
              <p className="text-4xl font-bold mt-2">{users.filter(u => u.studentRole === 'Sinh viên').length}</p>
              <p className="text-xs text-orange-200 mt-1">Vai trò học tập</p>
            </div>
            <Users className="w-12 h-12 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Permissions Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Shield className="w-6 h-6 text-purple-600 mr-2" />
            Vai trò Admin
          </h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="mt-1 w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-800">Quản lý toàn bộ hệ thống</p>
                <p className="text-sm text-gray-600">Truy cập dashboard admin, xem thống kê</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="mt-1 w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-800">Quản lý người dùng</p>
                <p className="text-sm text-gray-600">Thêm, sửa, xóa, khóa tài khoản người dùng</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="mt-1 w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-800">Kiểm duyệt nội dung</p>
                <p className="text-sm text-gray-600">Duyệt, xóa bài viết và bình luận</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="mt-1 w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-800">Quản lý sự kiện</p>
                <p className="text-sm text-gray-600">Tạo, sửa, xóa sự kiện</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="w-6 h-6 text-blue-600 mr-2" />
            Vai trò User
          </h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="mt-1 w-2 h-2 bg-blue-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-800">Đăng bài viết</p>
                <p className="text-sm text-gray-600">Tạo và chia sẻ bài viết lên hệ thống</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="mt-1 w-2 h-2 bg-blue-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-800">Bình luận & tương tác</p>
                <p className="text-sm text-gray-600">Like, comment, share bài viết</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="mt-1 w-2 h-2 bg-blue-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-800">Tham gia nhóm & sự kiện</p>
                <p className="text-sm text-gray-600">Tham gia các nhóm học tập và sự kiện</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="mt-1 w-2 h-2 bg-blue-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-800">Quản lý profile</p>
                <p className="text-sm text-gray-600">Cập nhật thông tin cá nhân</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table with Role Management */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 sm:p-6 border-b">
          <h3 className="text-xl font-semibold">Quản lý phân quyền người dùng</h3>
          <p className="text-sm text-gray-500 mt-1">Thay đổi vai trò và quyền hạn của người dùng</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Người dùng</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Email</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Vai trò hệ thống</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Vai trò học tập</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Ngày tham gia</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        src={resolveAvatarUrl(u.avatar, u.name)}
                        alt={u.name}
                        className="w-10 h-10 rounded-full mr-3"
                        onError={withAvatarFallback(u.name)}
                      />
                      <div>
                        <p className="font-medium text-gray-800">{u.name}</p>
                        {u._id === user?.id && (
                          <span className="text-xs text-blue-600">(Bạn)</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-gray-600 hidden sm:table-cell">{u.email}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateUserRole(u._id, e.target.value)}
                      disabled={u._id === user?.id}
                      className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border-2 focus:outline-none focus:ring-2 ${
                        u.role === 'admin' 
                          ? 'bg-purple-50 text-purple-800 border-purple-200' 
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      } ${u._id === user?.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
                      title={u._id === user?.id ? 'Không thể thay đổi vai trò của chính mình' : 'Click để thay đổi vai trò hệ thống'}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <select
                      value={u.studentRole}
                      onChange={(e) => handleUpdateStudentRole(u._id, e.target.value)}
                      className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border-2 focus:outline-none focus:ring-2 cursor-pointer hover:shadow-md ${
                        u.studentRole === 'Giảng viên' 
                          ? 'bg-green-50 text-green-800 border-green-200' 
                          : 'bg-orange-50 text-orange-800 border-orange-200'
                      }`}
                      title="Click để thay đổi vai trò học tập"
                    >
                      <option value="Sinh viên">Sinh viên</option>
                      <option value="Giảng viên">Giảng viên</option>
                    </select>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleUpdateUserStatus(u._id, u.status === 'active' ? 'banned' : 'active')}
                      disabled={u._id === user?.id}
                      className={`text-sm font-medium ${
                        u.status === 'active' 
                          ? 'text-orange-600 hover:text-orange-800' 
                          : 'text-green-600 hover:text-green-800'
                      } ${u._id === user?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={u._id === user?.id ? 'Không thể khóa tài khoản của chính mình' : ''}
                    >
                      {u.status === 'active' ? 'Khóa' : 'Mở khóa'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const handleSaveSettings = async () => {
    if (!systemSettings) return;
    
    setSettingsSaving(true);
    try {
      await api.put('/admin/settings', systemSettings);
      alert('✅ Đã lưu cài đặt hệ thống thành công!');
      fetchData();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(error.response?.data?.message || '❌ Lỗi lưu cài đặt hệ thống');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleResetSettings = async () => {
    if (!confirm('Bạn có chắc chắn muốn reset tất cả cài đặt về mặc định? Hành động này không thể hoàn tác.')) {
      return;
    }
    
    setSettingsSaving(true);
    try {
      await api.post('/admin/settings/reset');
      alert('✅ Đã reset cài đặt về mặc định!');
      fetchData();
    } catch (error) {
      console.error('Error resetting settings:', error);
      alert(error.response?.data?.message || '❌ Lỗi reset cài đặt');
    } finally {
      setSettingsSaving(false);
    }
  };

  const renderSettings = () => {
    if (!systemSettings) {
      return (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Đang tải cài đặt...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <Settings className="w-8 h-8 mr-3 text-blue-600" />
                Cài đặt hệ thống
              </h2>
              <p className="text-gray-600 mt-1">Quản lý các cài đặt chung của hệ thống</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleResetSettings}
                disabled={settingsSaving}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Reset về mặc định
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {settingsSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  'Lưu cài đặt'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Settings className="w-6 h-6 mr-2 text-blue-600" />
            Cài đặt chung
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên hệ thống
              </label>
              <input
                type="text"
                value={systemSettings.siteName || ''}
                onChange={(e) => setSystemSettings({ ...systemSettings, siteName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="DNU Social"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả hệ thống
              </label>
              <textarea
                value={systemSettings.siteDescription || ''}
                onChange={(e) => setSystemSettings({ ...systemSettings, siteDescription: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Mạng xã hội cho sinh viên DNU"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Logo (tùy chọn)
              </label>
              <input
                type="text"
                value={systemSettings.siteLogo || ''}
                onChange={(e) => setSystemSettings({ ...systemSettings, siteLogo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
        </div>

        {/* Registration Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="w-6 h-6 mr-2 text-green-600" />
            Cài đặt đăng ký
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Cho phép đăng ký mới
                </label>
                <p className="text-xs text-gray-500 mt-1">Cho phép người dùng mới đăng ký tài khoản</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.allowRegistration || false}
                  onChange={(e) => setSystemSettings({ ...systemSettings, allowRegistration: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Yêu cầu xác thực email
                </label>
                <p className="text-xs text-gray-500 mt-1">Người dùng phải xác thực email trước khi sử dụng</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.requireEmailVerification || false}
                  onChange={(e) => setSystemSettings({ ...systemSettings, requireEmailVerification: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Yêu cầu duyệt bởi Admin
                </label>
                <p className="text-xs text-gray-500 mt-1">Tài khoản mới cần được admin duyệt trước khi hoạt động</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.requireAdminApproval || false}
                  onChange={(e) => setSystemSettings({ ...systemSettings, requireAdminApproval: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Post Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <FileText className="w-6 h-6 mr-2 text-purple-600" />
            Cài đặt bài viết
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Tự động duyệt bài viết
                </label>
                <p className="text-xs text-gray-500 mt-1">Bài viết được hiển thị ngay sau khi đăng</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => {}}
                  disabled
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Yêu cầu duyệt bài viết
                </label>
                <p className="text-xs text-gray-500 mt-1">Bài viết cần được admin duyệt trước khi hiển thị</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => {}}
                  disabled
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              Bài viết trên trang chủ đang được cấu hình tự động duyệt, hiển thị ngay sau khi người dùng đăng.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Độ dài tối đa bài viết (ký tự)
                </label>
                <input
                  type="number"
                  value={systemSettings.maxPostLength || 5000}
                  onChange={(e) => setSystemSettings({ ...systemSettings, maxPostLength: parseInt(e.target.value) || 5000 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="100"
                  max="50000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kích thước file tối đa (bytes)
                </label>
                <input
                  type="number"
                  value={systemSettings.maxFileSize || 10485760}
                  onChange={(e) => setSystemSettings({ ...systemSettings, maxFileSize: parseInt(e.target.value) || 10485760 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1048576"
                  max="104857600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Hiện tại: {(systemSettings.maxFileSize || 10485760) / 1048576} MB
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Group Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-orange-600" />
            Cài đặt nhóm
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Tự động duyệt nhóm
                </label>
                <p className="text-xs text-gray-500 mt-1">Nhóm được tạo sẽ tự động được duyệt</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => {}}
                  disabled
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Yêu cầu duyệt nhóm
                </label>
                <p className="text-xs text-gray-500 mt-1">Nhóm cần được admin duyệt trước khi hoạt động</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => {}}
                  disabled
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              Nhóm mới tạo đang được cấu hình tự động duyệt, hiển thị ngay sau khi tạo.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số nhóm tối đa mỗi người dùng
              </label>
              <input
                type="number"
                value={systemSettings.maxGroupsPerUser || 10}
                onChange={(e) => setSystemSettings({ ...systemSettings, maxGroupsPerUser: parseInt(e.target.value) || 10 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="50"
              />
            </div>
          </div>
        </div>

        {/* Comment Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <MessageSquare className="w-6 h-6 mr-2 text-indigo-600" />
            Cài đặt bình luận
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Cho phép bình luận
                </label>
                <p className="text-xs text-gray-500 mt-1">Người dùng có thể bình luận trên bài viết</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.allowComments || false}
                  onChange={(e) => setSystemSettings({ ...systemSettings, allowComments: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Yêu cầu đăng nhập để bình luận
                </label>
                <p className="text-xs text-gray-500 mt-1">Chỉ người dùng đã đăng nhập mới có thể bình luận</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.requireLoginToComment || false}
                  onChange={(e) => setSystemSettings({ ...systemSettings, requireLoginToComment: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Độ dài tối đa bình luận (ký tự)
              </label>
              <input
                type="number"
                value={systemSettings.maxCommentLength || 1000}
                onChange={(e) => setSystemSettings({ ...systemSettings, maxCommentLength: parseInt(e.target.value) || 1000 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="50"
                max="5000"
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-red-600" />
            Cài đặt bảo mật
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số lần đăng nhập sai tối đa
                </label>
                <input
                  type="number"
                  value={systemSettings.maxLoginAttempts || 5}
                  onChange={(e) => setSystemSettings({ ...systemSettings, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="3"
                  max="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thời gian khóa tài khoản (phút)
                </label>
                <input
                  type="number"
                  value={systemSettings.lockoutDuration || 30}
                  onChange={(e) => setSystemSettings({ ...systemSettings, lockoutDuration: parseInt(e.target.value) || 30 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="5"
                  max="1440"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Yêu cầu mật khẩu mạnh
                </label>
                <p className="text-xs text-gray-500 mt-1">Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.requireStrongPassword || false}
                  onChange={(e) => setSystemSettings({ ...systemSettings, requireStrongPassword: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Độ dài mật khẩu tối thiểu
              </label>
              <input
                type="number"
                value={systemSettings.minPasswordLength || 6}
                onChange={(e) => setSystemSettings({ ...systemSettings, minPasswordLength: parseInt(e.target.value) || 6 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="6"
                max="20"
              />
            </div>
          </div>
        </div>

        {/* Maintenance Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <AlertCircle className="w-6 h-6 mr-2 text-yellow-600" />
            Chế độ bảo trì
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Bật chế độ bảo trì
                </label>
                <p className="text-xs text-gray-500 mt-1">Chỉ admin mới có thể truy cập hệ thống</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.maintenanceMode || false}
                  onChange={(e) => setSystemSettings({ ...systemSettings, maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
              </label>
            </div>
            {systemSettings.maintenanceMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thông báo bảo trì
                </label>
                <textarea
                  value={systemSettings.maintenanceMessage || ''}
                  onChange={(e) => setSystemSettings({ ...systemSettings, maintenanceMessage: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Hệ thống đang bảo trì. Vui lòng quay lại sau."
                />
              </div>
            )}
          </div>
        </div>

        {/* Save Button at Bottom */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleResetSettings}
              disabled={settingsSaving}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reset về mặc định
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={settingsSaving}
              className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {settingsSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Lưu tất cả cài đặt'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderComments = () => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-3 sm:p-4 md:p-5 lg:p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">Quản lý bình luận</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Thu thập và quản lý tất cả bình luận của người dùng</p>
            {comments.length > 0 && (
              <p className="text-xs sm:text-sm text-gray-600 mt-2 font-medium">
                Tìm thấy <span className="text-blue-600">{commentsPagination.total || comments.length}</span> bình luận
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap lg:flex-shrink-0">
            {selectedItems.comments.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm text-gray-600 font-medium bg-blue-50 px-2 py-1 rounded">
                  Đã chọn: {selectedItems.comments.length}
                </span>
                <button
                  onClick={handleBulkDeleteComments}
                  className="px-2 sm:px-3 py-1.5 bg-red-600 text-white text-xs sm:text-sm rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Xóa đã chọn
                </button>
                <button
                  onClick={() => setSelectedItems({ ...selectedItems, comments: [] })}
                  className="px-2 sm:px-3 py-1.5 bg-gray-500 text-white text-xs sm:text-sm rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  Bỏ chọn
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <input
              type="text"
              value={commentFilters.search}
              onChange={(e) => setCommentFilters({ ...commentFilters, search: e.target.value })}
              placeholder="Tìm kiếm nội dung..."
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm w-full"
            />

            <input
              type="text"
              value={commentFilters.author}
              onChange={(e) => setCommentFilters({ ...commentFilters, author: e.target.value })}
              placeholder="Tìm theo tên..."
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm w-full"
            />

            <input
              type="date"
              value={commentFilters.startDate}
              onChange={(e) => setCommentFilters({ ...commentFilters, startDate: e.target.value })}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm w-full"
              placeholder="Từ ngày"
            />

            <input
              type="date"
              value={commentFilters.endDate}
              onChange={(e) => setCommentFilters({ ...commentFilters, endDate: e.target.value })}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm w-full"
              placeholder="Đến ngày"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleFilterComments}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-xs sm:text-sm font-medium"
            >
              <Search className="w-3 h-3 sm:w-4 sm:h-4" />
              Lọc
            </button>
            <button
              onClick={() => {
                setCommentFilters({
                  search: '',
                  author: '',
                  startDate: '',
                  endDate: ''
                });
                setTimeout(() => handleFilterComments(), 100);
              }}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-xs sm:text-sm font-medium"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                <input
                  type="checkbox"
                  checked={selectedItems.comments.length === comments.length && comments.length > 0}
                  onChange={() => handleSelectAllItems('comments', comments.map(c => c._id))}
                  className="rounded w-4 h-4"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[180px]">Người bình luận</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nội dung</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[200px]">Bài viết</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[140px]">Ngày tạo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[120px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {comments.map((comment) => (
              <tr key={comment._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.comments.includes(comment._id)}
                    onChange={() => handleToggleItemSelection('comments', comment._id)}
                    className="rounded w-4 h-4"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveAvatarUrl(comment.author?.avatar, comment.author?.name)}
                      alt={comment.author?.name}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                      onError={withAvatarFallback(comment.author?.name)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 text-sm truncate">{comment.author?.name || 'Người dùng'}</p>
                      <p className="text-xs text-gray-500 truncate">{comment.author?.email || ''}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="inline-block max-w-full">
                    <div className="bg-gray-100 rounded-2xl px-3 py-2 border border-gray-200">
                      <p className="text-sm text-gray-800 line-clamp-3 break-words whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-600 line-clamp-2 break-words">
                    {comment.post?.title || (comment.post?.content ? comment.post.content.substring(0, 80) + '...' : 'N/A')}
                  </p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <div className="flex flex-col">
                    <span className="whitespace-nowrap">{formatDate(comment.createdAt)}</span>
                    <span className="text-xs text-gray-400 mt-0.5">{formatTimeAgo(comment.createdAt)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenCommentDetail(comment)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors font-medium"
                      title="Xem chi tiết"
                    >
                      Xem
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment._id)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors font-medium"
                      title="Xóa bình luận"
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden">
        <div className="divide-y divide-gray-200">
          {comments.map((comment) => (
            <div key={comment._id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedItems.comments.includes(comment._id)}
                  onChange={() => handleToggleItemSelection('comments', comment._id)}
                  className="rounded w-4 h-4 mt-1 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  {/* Author Info */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <img
                      src={resolveAvatarUrl(comment.author?.avatar, comment.author?.name)}
                      alt={comment.author?.name}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
                      onError={withAvatarFallback(comment.author?.name)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 text-sm truncate">{comment.author?.name || 'Người dùng'}</p>
                      <p className="text-xs text-gray-500 truncate">{comment.author?.email || ''}</p>
                    </div>
                    <div className="text-xs text-gray-500 flex-shrink-0 text-right">
                      <div>{formatDate(comment.createdAt)}</div>
                      <div className="text-gray-400">{formatTimeAgo(comment.createdAt)}</div>
                    </div>
                  </div>

                  {/* Comment Content */}
                  <div className="mb-2">
                    <div className="inline-block max-w-full">
                      <div className="bg-gray-100 rounded-2xl px-3 py-2 border border-gray-200">
                        <p className="text-sm text-gray-800 break-words line-clamp-3 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Post Info */}
                  <div className="mb-2 p-2 bg-gray-50 rounded text-xs sm:text-sm">
                    <p className="text-gray-600 font-medium mb-1">Bài viết:</p>
                    <p className="text-gray-700 line-clamp-2 break-words">
                      {comment.post?.title || (comment.post?.content ? comment.post.content.substring(0, 100) + '...' : 'N/A')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleOpenCommentDetail(comment)}
                      className="px-3 py-1.5 text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors font-medium flex-1"
                    >
                      Xem chi tiết
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment._id)}
                      className="px-3 py-1.5 text-xs sm:text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors font-medium flex-1"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {comments.length === 0 && !loading && (
        <div className="text-center py-8 sm:py-12 text-gray-500">
          <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
          <p className="text-base sm:text-lg font-medium">Không tìm thấy bình luận nào</p>
          <p className="text-xs sm:text-sm mt-1 px-4">
            {Object.values(commentFilters).some(v => v) 
              ? 'Thử thay đổi bộ lọc để tìm thêm bình luận' 
              : 'Chưa có bình luận nào trong hệ thống'}
          </p>
        </div>
      )}
      
      {/* Pagination */}
      {commentsPagination.totalPages > 1 && (
        <div className="p-3 sm:p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
            Trang <span className="font-medium">{commentsPagination.page}</span> / <span className="font-medium">{commentsPagination.totalPages}</span> 
            <span className="hidden sm:inline"> ({commentsPagination.total} bình luận)</span>
            <span className="sm:hidden"> ({commentsPagination.total})</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleChangeCommentsPage(commentsPagination.page - 1)}
              disabled={commentsPagination.page === 1}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition-colors"
            >
              ← Trước
            </button>
            <button
              onClick={() => handleChangeCommentsPage(commentsPagination.page + 1)}
              disabled={commentsPagination.page >= commentsPagination.totalPages}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition-colors"
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:pl-72 py-3 sm:py-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 p-2 rounded-lg shadow-sm">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">DNU Workspace Admin</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Quản trị hệ thống học tập Đại học Đại Nam</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="relative search-container hidden md:block">
              <input
                type="text"
                placeholder="Tìm kiếm người dùng, bài viết, bình luận..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 lg:w-80"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              
              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                  {searchLoading ? (
                    <div className="p-4 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      Không tìm thấy kết quả
                    </div>
                  ) : (
                    <div className="divide-y">
                      {searchResults.map((result, index) => (
                        <div
                          key={index}
                          onClick={() => handleSearchResultClick(result)}
                          className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              {result.type === 'user' && (
                                <div className="flex items-center space-x-2">
                                  <Users className="w-4 h-4 text-blue-600" />
                                  <div>
                                    <p className="font-medium text-gray-800">{result.name}</p>
                                    <p className="text-xs text-gray-500">{result.email}</p>
                                  </div>
                                </div>
                              )}
                              {result.type === 'post' && (
                                <div className="flex items-center space-x-2">
                                  <FileText className="w-4 h-4 text-green-600" />
                                  <div>
                                    <p className="font-medium text-gray-800 truncate">{result.content?.substring(0, 50)}...</p>
                                    <p className="text-xs text-gray-500">Bài viết bởi {result.author?.name}</p>
                                  </div>
                                </div>
                              )}
                              {result.type === 'comment' && (
                                <div className="flex items-center space-x-2">
                                  <MessageSquare className="w-4 h-4 text-purple-600" />
                                  <div>
                                    <p className="font-medium text-gray-800 truncate">{result.content?.substring(0, 50)}...</p>
                                    <p className="text-xs text-gray-500">Bình luận bởi {result.author?.name}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                              {result.type === 'user' ? 'Người dùng' : result.type === 'post' ? 'Bài viết' : 'Bình luận'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Refresh Button */}
            <button 
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-gray-100 rounded-lg relative group"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-6 h-6 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              {!isRefreshing && (
                <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Làm mới • Tự động sau {Math.floor((30000 - (Date.now() - lastRefreshTime)) / 1000)}s
                </span>
              )}
            </button>
            
            <div className="relative notification-dropdown-container">
              <button
                onClick={handleToggleHeaderNotifications}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Thông báo"
              >
                <Bell className="w-6 h-6 text-gray-600" />
                {headerUnreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {headerUnreadCount > 99 ? '99+' : headerUnreadCount}
                  </span>
                )}
              </button>

              {showHeaderNotifications && (
                <div className="absolute right-0 mt-2 w-[360px] max-w-[92vw] bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="font-semibold text-gray-800">Thông báo</p>
                    <button
                      onClick={handleHeaderMarkAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Đánh dấu tất cả đã đọc
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {headerNotificationsLoading ? (
                      <div className="p-6 text-center text-gray-500">
                        <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <p className="text-sm mt-2">Đang tải thông báo...</p>
                      </div>
                    ) : headerNotifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Chưa có thông báo</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {headerNotifications.map((notification) => (
                          <button
                            key={notification._id}
                            onClick={() => handleHeaderNotificationClick(notification)}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                              notification.isRead ? 'bg-white' : 'bg-blue-50/60'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <img
                                src={resolveAvatarUrl(notification.sender?.avatar, notification.sender?.name)}
                                alt={notification.sender?.name || 'System'}
                                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                                onError={withAvatarFallback(notification.sender?.name)}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-gray-800 line-clamp-2">{notification.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(notification.createdAt)}</p>
                              </div>
                              {!notification.isRead && <span className="w-2 h-2 mt-2 bg-blue-600 rounded-full flex-shrink-0"></span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                    <button
                      onClick={() => {
                        setActiveTab('notifications');
                        setShowHeaderNotifications(false);
                      }}
                      className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium py-1"
                    >
                      Xem tất cả thông báo
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative settings-dropdown-container">
              <button 
                onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-6 h-6 text-gray-600" />
              </button>

              {/* Settings Dropdown */}
              {showSettingsDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="p-2">
                    <button 
                      onClick={() => navigate('/user')}
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      <span className="text-gray-700">Về trang chủ</span>
                    </button>
                    <button 
                      onClick={() => {
                        setActiveTab('settings');
                        setShowSettingsDropdown(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <Settings className="w-5 h-5 text-gray-600" />
                      <span className="text-gray-700">Cài đặt hệ thống</span>
                    </button>
                  </div>
                  
                  <div className="p-2 border-t border-gray-200">
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowSettingsDropdown(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-5 h-5 text-red-600" />
                      <span className="text-red-600 font-medium">Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <img
                src="https://workspace.dainam.edu.vn/icons/favicon.svg"
                alt="DNU Workspace"
                className="w-10 h-10 rounded-lg shadow-sm border border-orange-100"
              />
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-800">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500">Quản trị viên</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex relative">
        {/* Sidebar - Fixed */}
        <aside className={`
          w-64 bg-white shadow-md fixed left-0 top-16 bottom-0 overflow-y-auto z-30
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <nav className="p-3 sm:p-4 space-y-2">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                activeTab === 'dashboard' ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium">Dashboard</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab('users');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                activeTab === 'users' ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium">Người dùng</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab('posts');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                activeTab === 'posts' ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium">Bài viết</span>
              </div>
              {pendingPostsCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                  {pendingPostsCount}
                </span>
              )}
            </button>
            
            <button
              onClick={() => {
                setActiveTab('comments');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                activeTab === 'comments' ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium">Bình luận</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab('events');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                activeTab === 'events' ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium">Sự kiện</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab('groups');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                activeTab === 'groups' ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium">Nhóm</span>
              </div>
              {pendingGroupsCount > 0 && (
                <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs font-bold rounded-full animate-pulse">
                  {pendingGroupsCount}
                </span>
              )}
            </button>
            
            <button
              onClick={() => {
                setActiveTab('notifications');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                activeTab === 'notifications' ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium">Thông báo</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab('reports');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                activeTab === 'reports' ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Flag className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium">Báo cáo</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab('ai-analytics');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                activeTab === 'ai-analytics' ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium">AI Phân Tích</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab('permissions');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                activeTab === 'permissions' ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium">Phân quyền</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab('settings');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                activeTab === 'settings' ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium">Cài đặt hệ thống</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 w-full lg:pl-72 transition-all duration-300">
          <div className="max-w-full xl:max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'users' && renderUsers()}
              {activeTab === 'posts' && renderPosts()}
              {activeTab === 'comments' && renderComments()}
              {activeTab === 'events' && renderEvents()}
              {activeTab === 'groups' && renderGroups()}
              {activeTab === 'notifications' && renderNotifications()}
              {activeTab === 'reports' && renderReports()}
              {activeTab === 'ai-analytics' && <AIAnalytics />}
              {activeTab === 'permissions' && renderPermissions()}
              {activeTab === 'settings' && renderSettings()}
            </>
          )}
          </div>
        </main>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={handleCloseEventModal}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold">
                {editingEvent ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
              </h3>
            </div>
            
            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề sự kiện <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={eventForm.title}
                  onChange={handleEventFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Hackathon DNU 2025"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  name="description"
                  value={eventForm.description}
                  onChange={handleEventFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Mô tả chi tiết về sự kiện..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày diễn ra <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={eventForm.date}
                    onChange={handleEventFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giờ diễn ra
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={eventForm.time}
                    onChange={handleEventFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Danh mục <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={eventForm.category}
                    onChange={handleEventFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Học thuật">Học thuật</option>
                    <option value="Thi đấu">Thi đấu</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Hackathon">Hackathon</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lượng tối đa
                  </label>
                  <input
                    type="number"
                    name="maxParticipants"
                    value={eventForm.maxParticipants}
                    onChange={handleEventFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Để trống = không giới hạn"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa điểm
                </label>
                <input
                  type="text"
                  name="location"
                  value={eventForm.location}
                  onChange={handleEventFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Hội trường A - Trường ĐH Bách Khoa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hình ảnh
                </label>
                <div className="mt-1">
                  {eventImagePreview ? (
                    <div className="relative">
                      <img src={eventImagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => {
                          setEventImagePreview(null);
                          setEventForm({ ...eventForm, image: null });
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click để upload</span> hoặc kéo thả
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF (MAX. 5MB)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEventImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseEventModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingEvent ? 'Cập nhật' : 'Tạo sự kiện'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Detail Modal */}
      {showPostDetailModal && selectedPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Chi tiết bài viết</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Xem xét nội dung trước khi duyệt
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPostDetailModal(false);
                  setSelectedPost(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Author Info */}
              <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
                <img
                  src={resolveAvatarUrl(selectedPost.author?.avatar, selectedPost.author?.name)}
                  alt={selectedPost.author?.name}
                  className="w-16 h-16 rounded-full"
                  onError={withAvatarFallback(selectedPost.author?.name)}
                />
                <div>
                  <h4 className="font-semibold text-lg text-gray-800">{selectedPost.author?.name}</h4>
                  <p className="text-sm text-gray-600">{selectedPost.author?.studentRole} • {selectedPost.author?.major}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(selectedPost.createdAt)}</p>
                </div>
              </div>

              {/* Post Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Danh mục</p>
                  <p className="font-semibold text-blue-800">{selectedPost.category || 'Khác'}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Lượt thích</p>
                  <p className="font-semibold text-green-800">{selectedPost.likes?.length || 0}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Bình luận</p>
                  <p className="font-semibold text-purple-800">{selectedPost.comments?.length || 0}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Trạng thái</p>
                  <p className={`font-semibold ${selectedPost.status === 'approved' ? 'text-green-800' : 'text-red-800'}`}>
                    {selectedPost.status === 'approved' ? 'Còn' : 'Đã xóa'}
                  </p>
                </div>
              </div>

              {/* Title */}
              {selectedPost.title && (
                <div>
                  <h5 className="text-sm font-medium text-gray-500 mb-2">Tiêu đề</h5>
                  <h3 className="text-xl font-bold text-gray-800">{selectedPost.title}</h3>
                </div>
              )}

              {/* Content */}
              <div>
                <h5 className="text-sm font-medium text-gray-500 mb-2">Nội dung</h5>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{selectedPost.content}</p>
                </div>
              </div>

              {/* Images */}
              {selectedPost.images && selectedPost.images.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-500 mb-3">Hình ảnh ({selectedPost.images.length})</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedPost.images.map((img, index) => {
                      // Xử lý URL: thêm baseURL nếu là relative path
                      const imageUrl = img.startsWith('/uploads') 
                        ? `http://localhost:5000${img}` 
                        : img;
                      const imageName = img.split('/').pop() || `image-${index + 1}.jpg`;
                      
                      return (
                        <div key={index} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`Image ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg border border-gray-200"
                          />
                          <a
                            href={(() => {
                              // Nếu là URL từ uploads, dùng route download
                              if (img.includes('/uploads/images/')) {
                                const filename = img.split('/uploads/images/')[1] || img.split('/').pop();
                                return `/api/files/download/${filename}`;
                              }
                              if (img.startsWith('/uploads')) {
                                const filename = img.split('/uploads/')[1]?.split('/').pop() || img.split('/').pop();
                                return `/api/files/download/${filename}`;
                              }
                              if (imageUrl.includes('localhost:5000/uploads')) {
                                const filename = imageUrl.split('/uploads/images/')[1] || imageUrl.split('/').pop();
                                return `/api/files/download/${filename}`;
                              }
                              return imageUrl;
                            })()}
                            download={imageName}
                            className="absolute bottom-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700"
                            onClick={(e) => {
                              // Đảm bảo download hoạt động
                              e.stopPropagation();
                            }}
                          >
                            ⬇️ Tải về
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Files */}
              {selectedPost.files && selectedPost.files.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-500 mb-3">Tệp đính kèm ({selectedPost.files.length})</h5>
                  <div className="space-y-2">
                    {selectedPost.files.map((file, index) => {
                      // Xử lý URL: thêm baseURL nếu là relative path
                      let fileUrl = file?.url || file?.fileUrl || null;
                      
                      if (fileUrl) {
                        // Nếu là relative path, thêm baseURL
                        if (fileUrl.startsWith('/uploads')) {
                          fileUrl = `http://localhost:5000${fileUrl}`;
                        } 
                        // Nếu là blob URL, không thể download
                        else if (fileUrl.startsWith('blob:')) {
                          fileUrl = null;
                        }
                        // Nếu là absolute URL (http/https), giữ nguyên
                        else if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
                          // Có thể là relative path khác
                          fileUrl = `http://localhost:5000${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
                        }
                      }
                      
                      // Nếu không có URL, kiểm tra xem có phải file được lưu trong images array không
                      // (một số file có thể được upload như ảnh)
                      if (!fileUrl && selectedPost.images && selectedPost.images.length > 0) {
                        // Có thể file được lưu trong images, nhưng không thể xác định chính xác
                        // Nên không tự động map
                      }
                      
                      const fileName = file?.name || `File ${index + 1}`;
                      const fileSize = file?.size || 'N/A';
                      const fileType = file?.type || 'Unknown';
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-3">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">{fileName}</p>
                              <p className="text-xs text-gray-500">{fileSize} • {fileType}</p>
                              {!fileUrl && (
                                <p className="text-xs text-amber-600 mt-1">
                                  ⚠️ File này chỉ có metadata, không có file thực để tải về
                                </p>
                              )}
                            </div>
                          </div>
                          {fileUrl ? (
                            <a
                              href={(() => {
                                // Nếu là URL từ uploads, dùng route download
                                if (fileUrl.includes('/uploads/images/')) {
                                  const filename = fileUrl.split('/uploads/images/')[1] || fileUrl.split('/').pop();
                                  return `/api/files/download/${filename}`;
                                }
                                // Nếu là relative path, thêm baseURL và dùng route download
                                if (fileUrl.startsWith('/uploads')) {
                                  const filename = fileUrl.split('/uploads/')[1]?.split('/').pop() || fileUrl.split('/').pop();
                                  return `/api/files/download/${filename}`;
                                }
                                // Nếu là absolute URL từ localhost, extract filename
                                if (fileUrl.includes('localhost:5000/uploads')) {
                                  const filename = fileUrl.split('/uploads/images/')[1] || fileUrl.split('/').pop();
                                  return `/api/files/download/${filename}`;
                                }
                                // Các trường hợp khác, dùng trực tiếp
                                return fileUrl;
                              })()}
                              download={fileName}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline px-3 py-1 bg-blue-50 rounded-lg transition-colors"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              ⬇️ Tải về
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm px-3 py-1 bg-gray-100 rounded-lg">
                              Không thể tải về
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedPost.tags && selectedPost.tags.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-500 mb-2">Thẻ tag</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedPost.tags.map((tag, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 bg-white border-t p-6 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPostDetailModal(false);
                  setSelectedPost(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Đóng
              </button>
              
              {selectedPost.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      if (window.confirm('Bạn có chắc chắn muốn từ chối bài viết này?')) {
                        handleRejectPost(selectedPost._id);
                      }
                    }}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    ✕ Từ chối
                  </button>
                  <button
                    onClick={() => handleApprovePost(selectedPost._id)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    ✓ Duyệt bài viết
                  </button>
                </>
              )}
              
              <button
                onClick={() => {
                  if (window.confirm('Bạn có chắc chắn muốn xóa bài viết này?')) {
                    handleDeletePost(selectedPost._id);
                    setShowPostDetailModal(false);
                    setSelectedPost(null);
                  }
                }}
                className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium"
              >
                🗑️ Xóa bài viết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Detail Modal */}
      {showGroupDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Chi tiết nhóm</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Thông tin đầy đủ về nhóm học tập
                </p>
              </div>
              <button
                onClick={() => {
                  setShowGroupDetailModal(false);
                  setSelectedGroup(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            {groupDetailLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-500 mt-4">Đang tải thông tin nhóm...</p>
              </div>
            ) : selectedGroup ? (
              <div className="p-6 space-y-6">
                {/* Group Info */}
                <div className="flex items-start space-x-4 bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg">
                  <div className="w-20 h-20 bg-purple-200 rounded-lg flex items-center justify-center text-4xl flex-shrink-0">
                    {selectedGroup.avatar || '📚'}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-gray-800">{selectedGroup.name}</h4>
                    <p className="text-gray-600 mt-2">{selectedGroup.description}</p>
                    <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                      <span>🏷️ {selectedGroup.category || 'Chung'}</span>
                      <span>👥 {selectedGroup.members?.length || 0} thành viên</span>
                      <span>📅 Tạo: {formatDate(selectedGroup.createdAt)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        selectedGroup.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedGroup.isPublic ? '🌍 Công khai' : '🔒 Riêng tư'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Creator Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-500 mb-3">Người tạo nhóm</h5>
                  <div className="flex items-center space-x-3">
                    <img
                      src={resolveAvatarUrl(selectedGroup.creator?.avatar, selectedGroup.creator?.name)}
                      alt={selectedGroup.creator?.name}
                      className="w-12 h-12 rounded-full"
                      onError={withAvatarFallback(selectedGroup.creator?.name)}
                    />
                    <div>
                      <p className="font-semibold text-gray-800">{selectedGroup.creator?.name}</p>
                      <p className="text-sm text-gray-600">{selectedGroup.creator?.studentRole} • {selectedGroup.creator?.major}</p>
                    </div>
                  </div>
                </div>

                {/* Members List */}
                <div>
                  <h5 className="text-lg font-semibold text-gray-800 mb-4">
                    Thành viên ({selectedGroup.members?.length || 0})
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {selectedGroup.members && selectedGroup.members.length > 0 ? (
                      selectedGroup.members.map((member, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <img
                            src={resolveAvatarUrl(member.user?.avatar, member.user?.name)}
                            alt={member.user?.name}
                            className="w-10 h-10 rounded-full"
                            onError={withAvatarFallback(member.user?.name)}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{member.user?.name}</p>
                            <p className="text-xs text-gray-500">{member.user?.studentRole}</p>
                          </div>
                          {member.role === 'admin' && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 col-span-2 text-center py-4">Chưa có thành viên nào</p>
                    )}
                  </div>
                </div>

                {/* Group Posts */}
                <div>
                  <h5 className="text-lg font-semibold text-gray-800 mb-4">
                    Bài viết trong nhóm ({selectedGroup.posts?.length || 0})
                  </h5>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedGroup.posts && selectedGroup.posts.length > 0 ? (
                      selectedGroup.posts.map((post) => (
                        <div key={post._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <img
                                src={resolveAvatarUrl(post.author?.avatar, post.author?.name)}
                                alt={post.author?.name}
                                className="w-10 h-10 rounded-full"
                                onError={withAvatarFallback(post.author?.name)}
                              />
                              <div>
                                <p className="font-medium text-gray-800">{post.author?.name}</p>
                                <p className="text-xs text-gray-500">{formatTimeAgo(post.createdAt)}</p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              post.status === 'approved' ? 'bg-green-100 text-green-800' : 
                              post.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              {post.status === 'approved' ? 'Đã duyệt' : 
                               post.status === 'pending' ? 'Chờ duyệt' : 'Bị từ chối'}
                            </span>
                          </div>
                          <p className="text-gray-800 mt-3 line-clamp-3">{post.content}</p>
                          <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                            <span>❤️ {post.likes?.length || 0}</span>
                            <span>💬 {post.comments?.length || 0}</span>
                            {post.category && (
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                {post.category}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">Chưa có bài viết nào trong nhóm</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-gray-500">Không thể tải thông tin nhóm</p>
              </div>
            )}

            {/* Actions */}
            <div className="sticky bottom-0 bg-white border-t p-6 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowGroupDetailModal(false);
                  setSelectedGroup(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Đóng
              </button>
              
              {selectedGroup && (
                <button
                  onClick={() => {
                    handleDeleteGroup(selectedGroup._id);
                    setShowGroupDetailModal(false);
                    setSelectedGroup(null);
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  🗑️ Xóa nhóm
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {showReportDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Chi tiết báo cáo</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Xem xét và xử lý báo cáo vi phạm
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReportDetailModal(false);
                  setSelectedReport(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Report Info */}
              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Flag className="w-6 h-6 text-orange-500 mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-800 text-lg">Thông tin báo cáo</h4>
                    <div className="mt-2 space-y-2">
                      <p className="text-orange-700 font-medium">Danh mục: {selectedReport.category || 'Khác'}</p>
                      <p className="text-orange-700">{selectedReport.reason || 'Không có lý do cụ thể'}</p>
                    </div>
                    <p className="text-sm text-orange-600 mt-2">
                      Báo cáo lúc: {formatTimeAgo(selectedReport.createdAt)} ({formatDate(selectedReport.createdAt)})
                    </p>
                    {selectedReport.reviewedBy && (
                      <p className="text-sm text-orange-600 mt-1">
                        Đã xem xét bởi: {selectedReport.reviewedBy?.name || 'Admin'} 
                        {selectedReport.reviewedAt && ` lúc ${formatTimeAgo(selectedReport.reviewedAt)}`}
                      </p>
                    )}
                    {selectedReport.adminNote && (
                      <div className="mt-2 p-2 bg-white rounded border border-orange-200">
                        <p className="text-xs text-orange-600 font-medium mb-1">Ghi chú của admin:</p>
                        <p className="text-sm text-orange-700">{selectedReport.adminNote}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Reporter & Reported */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-500 mb-3">Người báo cáo</h5>
                  <div className="flex items-center space-x-3">
                    <img
                      src={resolveAvatarUrl(selectedReport.reporter?.avatar, selectedReport.reporter?.name)}
                      alt={selectedReport.reporter?.name}
                      className="w-12 h-12 rounded-full"
                      onError={withAvatarFallback(selectedReport.reporter?.name)}
                    />
                    <div>
                      <p className="font-semibold text-gray-800">{selectedReport.reporter?.name || 'N/A'}</p>
                      <p className="text-sm text-gray-600">{selectedReport.reporter?.email || ''}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-500 mb-3">Người bị báo cáo</h5>
                  {selectedReport.reportedUser ? (
                    <div className="flex items-center space-x-3">
                      <img
                        src={resolveAvatarUrl(selectedReport.reportedUser?.avatar, selectedReport.reportedUser?.name, 'ef4444')}
                        alt={selectedReport.reportedUser?.name}
                        className="w-12 h-12 rounded-full"
                        onError={withAvatarFallback(selectedReport.reportedUser?.name, 'ef4444')}
                      />
                      <div>
                        <p className="font-semibold text-gray-800">{selectedReport.reportedUser?.name || 'N/A'}</p>
                        <p className="text-sm text-gray-600">{selectedReport.reportedUser?.email || ''}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Không có thông tin</p>
                  )}
                </div>
              </div>

              {/* Reported Content */}
              {(selectedReport.reportedPost || selectedReport.reportedComment || selectedReport.reportedEvent) && (
                <div className="border-2 border-red-200 rounded-lg p-6 bg-red-50">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-lg font-semibold text-red-800 flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      Nội dung bị báo cáo ({selectedReport.reportedPost ? 'Bài viết' : selectedReport.reportedComment ? 'Bình luận' : 'Sự kiện'})
                    </h5>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedReport.reportedPost ? 'bg-blue-100 text-blue-800' : selectedReport.reportedComment ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedReport.reportedPost ? '📝 Bài viết' : selectedReport.reportedComment ? '💬 Bình luận' : '📅 Sự kiện'}
                    </span>
                  </div>

                  {selectedReport.reportedPost && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Nội dung bài viết:</p>
                        <div className="bg-white p-4 rounded-lg border border-red-200">
                          <p className="text-gray-800 whitespace-pre-wrap">
                            {selectedReport.reportedPost.content || 'Không có nội dung'}
                          </p>
                        </div>
                      </div>
                      {selectedReport.reportedPost.category && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Danh mục:</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {selectedReport.reportedPost.category}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedReport.reportedComment && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Nội dung bình luận:</p>
                        <div className="bg-white p-4 rounded-lg border border-red-200">
                          <p className="text-gray-800 whitespace-pre-wrap">
                            {selectedReport.reportedComment.content || 'Không có nội dung'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedReport.reportedEvent && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Tiêu đề sự kiện:</p>
                        <div className="bg-white p-4 rounded-lg border border-red-200">
                          <p className="text-gray-800 font-medium whitespace-pre-wrap">
                            {selectedReport.reportedEvent.title || 'Không có tiêu đề'}
                          </p>
                          {selectedReport.reportedEvent.location && (
                            <p className="text-sm text-gray-600 mt-2">
                              Địa điểm: {selectedReport.reportedEvent.location}
                            </p>
                          )}
                          {selectedReport.reportedEvent.date && (
                            <p className="text-sm text-gray-600 mt-1">
                              Thời gian: {new Date(selectedReport.reportedEvent.date).toLocaleString('vi-VN')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Warning */}
              {selectedReport.status === 'pending' && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-yellow-800">Lưu ý</h5>
                      <p className="text-sm text-yellow-700 mt-1">
                        Vui lòng xem xét kỹ nội dung trước khi thực hiện hành động. 
                        Xóa nội dung sẽ đồng thời đánh dấu báo cáo đã xử lý.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 bg-white border-t p-6 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowReportDetailModal(false);
                  setSelectedReport(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Đóng
              </button>

              <div className="flex items-center space-x-3">
                {selectedReport.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleResolveReport(selectedReport._id)}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      ✓ Đánh dấu đã xử lý
                    </button>
                    <button
                      onClick={() => handleDismissReport(selectedReport._id)}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      ✗ Bỏ qua
                    </button>
                    {(selectedReport.reportedPost || selectedReport.reportedComment) && (
                      <button
                        onClick={() => handleDeleteReportedContent(selectedReport)}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        🗑️ Xóa {selectedReport.reportedPost ? 'bài viết' : 'bình luận'}
                      </button>
                    )}
                  </>
                )}
                
                <button
                  onClick={() => handleDeleteReport(selectedReport._id)}
                  className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium"
                >
                  🗑️ Xóa báo cáo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Notification Modal */}
      {showSendNotificationModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => {
            setShowSendNotificationModal(false);
            setNotificationForm({
              recipientIds: [],
              message: '',
              type: 'admin',
              link: ''
            });
            setSelectedUsersForNotification([]);
            setUserSearchForNotification('');
            setSearchedUsers([]);
          }}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 md:p-6 border-b">
              <h3 className="text-lg md:text-xl font-semibold">Gửi thông báo</h3>
              <p className="text-xs md:text-sm text-gray-500 mt-1">Gửi thông báo đến một hoặc nhiều người dùng</p>
            </div>
            
            <div className="p-4 md:p-6 space-y-4">
              {/* Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Người nhận <span className="text-red-500">*</span>
                </label>
                
                {/* Search Users */}
                <div className="relative mb-3">
                  <input
                    type="text"
                    value={userSearchForNotification}
                    onChange={(e) => handleSearchUsersForNotification(e.target.value)}
                    placeholder="Tìm kiếm người dùng..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchedUsers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchedUsers.map((user) => (
                        <div
                          key={user._id}
                          onClick={() => handleAddUserToNotification(user)}
                          className="p-3 hover:bg-gray-50 cursor-pointer flex items-center space-x-3"
                        >
                          <img
                            src={resolveAvatarUrl(user.avatar, user.name)}
                            alt={user.name}
                            className="w-8 h-8 rounded-full"
                            onError={withAvatarFallback(user.name)}
                          />
                          <div>
                            <p className="font-medium text-gray-800">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Users */}
                {selectedUsersForNotification.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedUsersForNotification.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full"
                      >
                        <img
                          src={resolveAvatarUrl(user.avatar, user.name)}
                          alt={user.name}
                          className="w-6 h-6 rounded-full"
                          onError={withAvatarFallback(user.name)}
                        />
                        <span className="text-sm font-medium text-blue-800">{user.name}</span>
                        <button
                          onClick={() => handleRemoveUserFromNotification(user._id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Đã chọn: {selectedUsersForNotification.length} người dùng
                </p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nội dung thông báo <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  placeholder="Nhập nội dung thông báo..."
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại thông báo
                </label>
                <select
                  value={notificationForm.type}
                  onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin">Admin</option>
                  <option value="message">Tin nhắn</option>
                  <option value="event">Sự kiện</option>
                  <option value="group">Nhóm</option>
                </select>
              </div>

              {/* Link (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link (tùy chọn)
                </label>
                <input
                  type="text"
                  value={notificationForm.link}
                  onChange={(e) => setNotificationForm({ ...notificationForm, link: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: /posts/123"
                />
              </div>
            </div>

            <div className="p-4 md:p-6 border-t flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => {
                  setShowSendNotificationModal(false);
                  setNotificationForm({
                    recipientIds: [],
                    message: '',
                    type: 'admin',
                    link: ''
                  });
                  setSelectedUsersForNotification([]);
                  setUserSearchForNotification('');
                  setSearchedUsers([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto"
              >
                Hủy
              </button>
              <button
                onClick={handleSendNotification}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
              >
                Gửi thông báo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Detail Modal */}
      {showNotificationDetailModal && selectedNotification && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => {
            setShowNotificationDetailModal(false);
            setSelectedNotification(null);
          }}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-4 md:p-6 flex items-center justify-between z-10">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl md:text-2xl font-bold text-gray-800">Chi tiết thông báo</h3>
                <p className="text-xs md:text-sm text-gray-500 mt-1">Thông tin chi tiết về thông báo</p>
              </div>
              <button
                onClick={() => {
                  setShowNotificationDetailModal(false);
                  setSelectedNotification(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Notification Info */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 md:p-4 rounded-lg">
                <div className="flex items-start space-x-2 md:space-x-3">
                  <Bell className="w-5 h-5 md:w-6 md:h-6 text-blue-500 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-blue-800 text-base md:text-lg">Nội dung thông báo</h4>
                    <p className="text-blue-700 mt-2 whitespace-pre-wrap break-words text-sm md:text-base">{selectedNotification.message}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedNotification.type === 'admin' ? 'bg-purple-100 text-purple-800' :
                        selectedNotification.type === 'message' ? 'bg-blue-100 text-blue-800' :
                        selectedNotification.type === 'comment' ? 'bg-green-100 text-green-800' :
                        selectedNotification.type === 'like' ? 'bg-red-100 text-red-800' :
                        selectedNotification.type === 'friend_request' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedNotification.type === 'admin' ? 'Admin' :
                         selectedNotification.type === 'message' ? 'Tin nhắn' :
                         selectedNotification.type === 'comment' ? 'Bình luận' :
                         selectedNotification.type === 'like' ? 'Thích' :
                         selectedNotification.type === 'friend_request' ? 'Kết bạn' :
                         selectedNotification.type === 'group' ? 'Nhóm' :
                         selectedNotification.type === 'event' ? 'Sự kiện' :
                         selectedNotification.type}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedNotification.isRead ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {selectedNotification.isRead ? 'Đã đọc' : 'Chưa đọc'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sender & Recipient */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                  <h5 className="text-xs md:text-sm font-medium text-gray-500 mb-2 md:mb-3">Người gửi</h5>
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <img
                      src={resolveAvatarUrl(selectedNotification.sender?.avatar, selectedNotification.sender?.name)}
                      alt={selectedNotification.sender?.name}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full flex-shrink-0"
                      onError={withAvatarFallback(selectedNotification.sender?.name)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 text-sm md:text-base truncate">{selectedNotification.sender?.name || 'System'}</p>
                      <p className="text-xs md:text-sm text-gray-600 truncate">{selectedNotification.sender?.email || ''}</p>
                      {selectedNotification.sender?.studentRole && (
                        <p className="text-xs text-gray-500 truncate">{selectedNotification.sender.studentRole}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-3 md:p-4 rounded-lg">
                  <h5 className="text-xs md:text-sm font-medium text-gray-500 mb-2 md:mb-3">Người nhận</h5>
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <img
                      src={resolveAvatarUrl(selectedNotification.recipient?.avatar, selectedNotification.recipient?.name, '10b981')}
                      alt={selectedNotification.recipient?.name}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full flex-shrink-0"
                      onError={withAvatarFallback(selectedNotification.recipient?.name, '10b981')}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 text-sm md:text-base truncate">{selectedNotification.recipient?.name || 'User'}</p>
                      <p className="text-xs md:text-sm text-gray-600 truncate">{selectedNotification.recipient?.email || ''}</p>
                      {selectedNotification.recipient?.studentRole && (
                        <p className="text-xs text-gray-500 truncate">{selectedNotification.recipient.studentRole}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Related Content */}
              {(selectedNotification.post || selectedNotification.comment || selectedNotification.event || selectedNotification.group) && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 md:p-4 rounded-lg">
                  <h5 className="text-xs md:text-sm font-medium text-yellow-800 mb-2">Nội dung liên quan</h5>
                  {selectedNotification.post && (
                    <div>
                      <p className="text-xs text-yellow-600 mb-1">Bài viết:</p>
                      <p className="text-sm text-yellow-800 font-medium">{selectedNotification.post.title || selectedNotification.post.content?.substring(0, 100)}</p>
                    </div>
                  )}
                  {selectedNotification.comment && (
                    <div>
                      <p className="text-xs text-yellow-600 mb-1">Bình luận:</p>
                      <p className="text-sm text-yellow-800">{selectedNotification.comment.content?.substring(0, 100)}</p>
                    </div>
                  )}
                  {selectedNotification.event && (
                    <div>
                      <p className="text-xs text-yellow-600 mb-1">Sự kiện:</p>
                      <p className="text-sm text-yellow-800 font-medium">{selectedNotification.event.title}</p>
                    </div>
                  )}
                  {selectedNotification.group && (
                    <div>
                      <p className="text-xs text-yellow-600 mb-1">Nhóm:</p>
                      <p className="text-sm text-yellow-800 font-medium">{selectedNotification.group.name}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Timestamps */}
              <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                <div className="space-y-2 text-xs md:text-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-gray-600">Thời gian tạo:</span>
                    <span className="text-gray-800 font-medium break-words">
                      {formatDate(selectedNotification.createdAt)} ({formatTimeAgo(selectedNotification.createdAt)})
                    </span>
                  </div>
                  {selectedNotification.updatedAt && selectedNotification.updatedAt !== selectedNotification.createdAt && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="text-gray-600">Cập nhật lần cuối:</span>
                      <span className="text-gray-800 font-medium break-words">
                        {formatDate(selectedNotification.updatedAt)} ({formatTimeAgo(selectedNotification.updatedAt)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 bg-white border-t p-4 md:p-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                onClick={() => {
                  setShowNotificationDetailModal(false);
                  setSelectedNotification(null);
                }}
                className="px-4 md:px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium w-full sm:w-auto"
              >
                Đóng
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-3 w-full sm:w-auto">
                {selectedNotification.link && (
                  <button
                    onClick={() => {
                      if (selectedNotification.link.startsWith('http')) {
                        window.open(selectedNotification.link, '_blank');
                      } else {
                        navigate(selectedNotification.link);
                        setShowNotificationDetailModal(false);
                        setSelectedNotification(null);
                      }
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    🔗 Đi đến nội dung
                  </button>
                )}
                <button
                  onClick={() => {
                    handleDeleteNotification(selectedNotification._id);
                    setShowNotificationDetailModal(false);
                    setSelectedNotification(null);
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  🗑️ Xóa thông báo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Tạo người dùng mới</h3>
                  <p className="text-sm text-gray-500 mt-1">Thêm người dùng mới vào hệ thống</p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateUserModal(false);
                    setUserForm({
                      name: '',
                      email: '',
                      password: '',
                      studentRole: 'Sinh viên',
                      major: '',
                      studentId: '',
                      role: 'user',
                      bio: ''
                    });
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập họ và tên"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="example@dnu.edu.vn"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tối thiểu 6 ký tự"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Mật khẩu phải có ít nhất 6 ký tự</p>
              </div>

              {/* Role & Student Role */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vai trò hệ thống
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vai trò học tập
                  </label>
                  <select
                    value={userForm.studentRole}
                    onChange={(e) => setUserForm({ ...userForm, studentRole: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Sinh viên">Sinh viên</option>
                    <option value="Giảng viên">Giảng viên</option>
                  </select>
                </div>
              </div>

              {/* Major */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chuyên ngành
                </label>
                <input
                  type="text"
                  value={userForm.major}
                  onChange={(e) => setUserForm({ ...userForm, major: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Công nghệ thông tin"
                />
              </div>

              {/* Student ID */}
              {userForm.studentRole === 'Sinh viên' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mã sinh viên
                  </label>
                  <input
                    type="text"
                    value={userForm.studentId}
                    onChange={(e) => setUserForm({ ...userForm, studentId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: K17CNTT001"
                  />
                </div>
              )}

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Giới thiệu
                </label>
                <textarea
                  value={userForm.bio}
                  onChange={(e) => setUserForm({ ...userForm, bio: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Giới thiệu về người dùng..."
                />
              </div>

              <div className="p-6 border-t flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateUserModal(false);
                    setUserForm({
                      name: '',
                      email: '',
                      password: '',
                      studentRole: 'Sinh viên',
                      major: '',
                      studentId: '',
                      role: 'user',
                      bio: ''
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Tạo người dùng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Group Modal */}
      {showRejectGroupModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Từ chối nhóm</h3>
              <button
                onClick={() => {
                  setShowRejectGroupModal(false);
                  setRejectReason('');
                  setSelectedGroup(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                Bạn đang từ chối nhóm: <strong>{selectedGroup.name}</strong>
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do từ chối (tùy chọn):
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối nhóm..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows="4"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectGroupModal(false);
                  setRejectReason('');
                  setSelectedGroup(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleRejectGroup}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Từ chối nhóm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Detail Modal */}
      {showCommentDetailModal && selectedComment && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowCommentDetailModal(false);
            setSelectedComment(null);
          }}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Chi tiết bình luận</h3>
                <button
                  onClick={() => {
                    setShowCommentDetailModal(false);
                    setSelectedComment(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Người bình luận</label>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <img
                    src={resolveAvatarUrl(selectedComment.author?.avatar, selectedComment.author?.name)}
                    alt={selectedComment.author?.name}
                    className="w-10 h-10 rounded-full"
                    onError={withAvatarFallback(selectedComment.author?.name)}
                  />
                  <div>
                    <p className="font-medium text-gray-800">{selectedComment.author?.name}</p>
                    <p className="text-sm text-gray-500">{selectedComment.author?.email}</p>
                    <p className="text-xs text-gray-400">{selectedComment.author?.studentRole}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung bình luận</label>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-wrap">{selectedComment.content}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bài viết</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-800">{selectedComment.post?.title || 'N/A'}</p>
                  {selectedComment.post?.content && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{selectedComment.post.content}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày tạo</label>
                  <p className="text-gray-600">{formatDate(selectedComment.createdAt)}</p>
                  <p className="text-xs text-gray-400">{formatTimeAgo(selectedComment.createdAt)}</p>
                </div>
                {selectedComment.updatedAt && selectedComment.updatedAt !== selectedComment.createdAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cập nhật lần cuối</label>
                    <p className="text-gray-600">{formatDate(selectedComment.updatedAt)}</p>
                    <p className="text-xs text-gray-400">{formatTimeAgo(selectedComment.updatedAt)}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => handleDeleteComment(selectedComment._id)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Xóa bình luận
                </button>
                <button
                  onClick={() => {
                    setShowCommentDetailModal(false);
                    setSelectedComment(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat AI */}
      <ChatAI />
    </div>
  );
};

export default AdminDashboard;

