import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Search, ArrowLeft, MoreVertical, Check, CheckCheck, Image as ImageIcon, FileText, Paperclip, Film, Users, Plus, UserPlus, LogOut, Trash2, Ban, User, UserMinus, RotateCcw, ExternalLink, Calendar } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import { formatTimeAgo } from '../utils/formatTime';
import { getSocket, initializeSocket, disconnectSocket } from '../utils/socket';
import { parseEventShareFromMessage, resolveEventShareImageUrl } from '../utils/eventShareMessage.js';
import { parseGroupShareFromMessage, resolveGroupShareImageUrl } from '../utils/groupShareMessage.js';
import { emitAppEvent, onAppEvent } from '../shared/events/appEventBus';

/** So sánh id từ Mongo/API/socket (ObjectId vs string) — dùng thay cho === */
const idsEqual = (a, b) => {
  if (a == null || b == null) return false;
  return String(a) === String(b);
};

/** Tin chia sẻ bài: /groups/<groupId>?post=<postId> (có hoặc không có / trước ?) hoặc .../home?post=<postId> */
const extractShareTargetFromMessage = (text) => {
  if (!text || typeof text !== 'string') return null;
  const groupIdx = text.indexOf('/groups/');
  if (groupIdx >= 0) {
    const after = text.slice(groupIdx + '/groups/'.length);
    const gid = after.match(/^([a-fA-F0-9]{24})(?=\/|\?|#|\s|&|$)/i);
    const p = text.match(/[?&]post=([a-fA-F0-9]{24})\b/i);
    if (gid && p) return { kind: 'group', groupId: gid[1], postId: p[1] };
  }
  const m = text.match(/[?&]post=([a-fA-F0-9]{24})\b/i);
  return m ? { kind: 'home', postId: m[1] } : null;
};

/** Đính kèm qua nút ghim: tài liệu + video (khớp backend upload) */
const CHAT_FILE_ACCEPT = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.zip',
  '.rar',
  '.7z',
  '.mp4',
  '.webm',
  '.mov',
  '.mkv',
  '.avi',
  '.m4v',
  '.ogv',
  '.mpeg',
  '.mpg',
  'video/*'
].join(',');

/** Preview video local trước khi gửi — revoke blob URL khi unmount */
const ChatLocalVideoPreview = ({ file }) => {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <video
      src={url}
      className="w-full max-h-24 object-contain"
      muted
      playsInline
      preload="metadata"
    />
  );
};

const stripTrailingShareUrl = (text) => {
  const idx = text.indexOf('Xem tại:');
  if (idx >= 0) return text.slice(0, idx).trim();
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/** Ngày giờ trên thẻ chia sẻ sự kiện trong chat (gần giống Facebook). */
function formatEventShareCardDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const wd = d.toLocaleDateString('vi-VN', { weekday: 'short' });
  const cap = wd ? wd.charAt(0).toUpperCase() + wd.slice(1) : '';
  const rest = `${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
  const t = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${cap}, ${rest} lúc ${t}`;
}

function formatGroupShareCardSubtitle(gs) {
  const n = gs.memberCount ?? 0;
  const parts = [`${n} thành viên`, gs.accessLabel || ''].filter(Boolean);
  if (gs.updatedAt) {
    try {
      parts.push(`Cập nhật ${formatTimeAgo(gs.updatedAt)}`);
    } catch {
      /* ignore */
    }
  }
  return parts.join(' · ');
}

function lastMessagePreviewBody(lastMessage) {
  if (!lastMessage) return 'Đã gửi file';
  const c = lastMessage.content;
  if (c) {
    const ev = parseEventShareFromMessage(c);
    if (ev) return `📅 ${ev.title}`;
    const grp = parseGroupShareFromMessage(c);
    if (grp) return `👥 ${grp.title}`;
    return c;
  }
  if (lastMessage.images?.length > 0) return `📷 ${lastMessage.images.length} ảnh`;
  if (lastMessage.files?.length > 0) return `📎 ${lastMessage.files.length} file`;
  return 'Đã gửi file';
}

const ChatUsers = () => {
  const chatWindowRight = '4.75rem';
  const chatGap = '0.5rem';
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const resolveAvatarUrl = (avatar, name, background = '10b981') => {
    if (avatar) {
      const a = String(avatar);
      if (a.startsWith('/uploads')) return `http://localhost:5000${a}`;
      return a;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${background}&color=fff`;
  };

  const withAvatarFallback = (name, background = '10b981') => (e) => {
    if (e.currentTarget?.dataset?.fallbackApplied) return;
    if (e.currentTarget?.dataset) e.currentTarget.dataset.fallbackApplied = '1';
    e.currentTarget.src = resolveAvatarUrl('', name, background);
  };

  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchUsers, setSearchUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [groupParticipants, setGroupParticipants] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addMembersSearchQuery, setAddMembersSearchQuery] = useState('');
  const [addMembersSearchResults, setAddMembersSearchResults] = useState([]);
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [recallingMessageId, setRecallingMessageId] = useState(null);
  const [openConversationMenu, setOpenConversationMenu] = useState(null);
  const [deletingConversationId, setDeletingConversationId] = useState(null);
  const [blockingUserId, setBlockingUserId] = useState(null);
  const [openParticipantMenu, setOpenParticipantMenu] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [removingParticipantId, setRemovingParticipantId] = useState(null);
  const [conversationFilter, setConversationFilter] = useState('all'); // 'all', 'unread', 'group'
  const participantMenuRef = useRef(null);
  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);
  const userMenuRef = useRef(null);
  const conversationMenuRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const groupAvatarInputRef = useRef(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    emitAppEvent('chatUsersVisibilityChange', { isOpen });

    return () => {
      emitAppEvent('chatUsersVisibilityChange', { isOpen: false });
    };
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 900px)');
    const syncViewport = () => setIsNarrowViewport(media.matches);
    syncViewport();
    media.addEventListener('change', syncViewport);
    return () => media.removeEventListener('change', syncViewport);
  }, []);

  /** URL trong bubble: cùng origin → React Router; khác → tab mới */
  const renderTextWithClickableUrls = useCallback((text, isOwnBubble) => {
    if (text == null || text === '') return null;
    const re = /(https?:\/\/[^\s]+)/g;
    const nodes = [];
    let last = 0;
    let m;
    let k = 0;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) {
        nodes.push(
          <span key={`t-${k++}`} className="whitespace-pre-wrap">
            {text.slice(last, m.index)}
          </span>
        );
      }
      const rawUrl = m[1];
      const url = rawUrl.replace(/[),.;:!?]+$/g, '');
      const consumed = rawUrl.length;
      nodes.push(
        <a
          key={`u-${k++}`}
          href={url}
          onClick={(e) => {
            e.preventDefault();
            try {
              const u = new URL(url, window.location.origin);
              if (u.origin === window.location.origin) {
                navigate(`${u.pathname}${u.search}${u.hash}`);
              } else {
                window.open(url, '_blank', 'noopener,noreferrer');
              }
            } catch {
              window.open(url, '_blank', 'noopener,noreferrer');
            }
          }}
          className={
            isOwnBubble
              ? 'underline break-all text-blue-50 hover:text-white'
              : 'underline break-all text-blue-700 hover:text-blue-900'
          }
        >
          {url}
        </a>
      );
      last = m.index + consumed;
    }
    if (last < text.length) {
      nodes.push(
        <span key={`t-${k++}`} className="whitespace-pre-wrap">
          {text.slice(last)}
        </span>
      );
    }
    return nodes.length ? <Fragment>{nodes}</Fragment> : <span className="whitespace-pre-wrap">{text}</span>;
  }, [navigate]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Initialize socket connection
  useEffect(() => {
    if (user) {
      const socket = initializeSocket();
      socketRef.current = socket;

      if (socket) {
        const handleMessageNew = (data) => {
          if (idsEqual(data.conversationId, selectedConversationRef.current?._id)) {
            setMessages(prev => {
              // Check if message already exists
              if (prev.find((m) => idsEqual(m._id, data.message?._id))) {
                return prev;
              }
              return [...prev, data.message];
            });
            scrollToBottom();
          }
          
          // Update conversations list (silent update)
          fetchConversations(false);
          fetchUnreadCount();
          emitAppEvent('messagesUpdated');
        };

        const handleTypingStart = (data) => {
          if (idsEqual(data.conversationId, selectedConversationRef.current?._id) && !idsEqual(data.userId, user.id)) {
            setTypingUsers(prev => new Set([...prev, data.userId]));
          }
        };

        const handleTypingStop = (data) => {
          if (idsEqual(data.conversationId, selectedConversationRef.current?._id)) {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.userId);
              return newSet;
            });
          }
        };

        const handleMessageRead = (data) => {
          if (idsEqual(data.conversationId, selectedConversationRef.current?._id)) {
            setMessages(prev => prev.map(msg => 
              idsEqual(msg.sender?._id, data.userId) ? { ...msg, isRead: true } : msg
            ));
          }
        };

        const handleNotificationNew = () => {
          fetchUnreadCount();
          emitAppEvent('messagesUpdated');
        };

        const handleConversationNew = (data) => {
          if (data.conversation) {
            setConversations(prev => {
              // Check if conversation already exists
              if (prev.find((c) => idsEqual(c._id, data.conversation._id))) {
                return prev;
              }
              return [data.conversation, ...prev];
            });
          }
        };

        const handleConversationUpdated = (data) => {
          if (data.conversation) {
            setConversations(prev => prev.map(c => 
              idsEqual(c._id, data.conversation._id) ? data.conversation : c
            ));
            // Update selected conversation if it's the updated one
            if (idsEqual(selectedConversationRef.current?._id, data.conversation._id)) {
              setSelectedConversation(data.conversation);
              // Refresh participants if modal is open
              if (showParticipants && data.conversation.type === 'group') {
                fetchGroupParticipants(data.conversation._id);
              }
            }
          }
        };

        const handleConversationRemoved = (data) => {
          if (data.conversationId) {
            setConversations(prev => prev.filter((c) => !idsEqual(c._id, data.conversationId)));
            if (idsEqual(selectedConversationRef.current?._id, data.conversationId)) {
              setSelectedConversation(null);
            }
          }
        };

        const handleMessageDeleted = (data) => {
          if (idsEqual(data.conversationId, selectedConversationRef.current?._id)) {
            setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
            // Refresh conversations to update lastMessage (silent update)
            fetchConversations(false);
          }
        };

        const handleMessageRecalled = (data) => {
          if (idsEqual(data.conversationId, selectedConversationRef.current?._id)) {
            setMessages(prev => prev.map(msg => 
              idsEqual(msg._id, data.messageId) ? { ...msg, isRecalled: true, recalledAt: new Date() } : msg
            ));
            // Refresh conversations to update lastMessage (silent update)
            fetchConversations(false);
          }
        };

        // Listen for new messages
        socket.on('message:new', handleMessageNew);

        // Listen for typing indicators
        socket.on('typing:start', handleTypingStart);
        socket.on('typing:stop', handleTypingStop);

        // Listen for read receipts
        socket.on('message:read', handleMessageRead);

        // Listen for notifications
        socket.on('notification:new', handleNotificationNew);

        // Listen for new conversation (group created)
        socket.on('conversation:new', handleConversationNew);

        // Listen for conversation updates
        socket.on('conversation:updated', handleConversationUpdated);

        // Listen for conversation removed
        socket.on('conversation:removed', handleConversationRemoved);

        // Listen for message deleted
        socket.on('message:deleted', handleMessageDeleted);

        // Listen for message recalled
        socket.on('message:recalled', handleMessageRecalled);

        // Keep exact handlers for cleanup to avoid removing listeners from other components.
        socketRef.current.__chatUsersHandlers = {
          handleMessageNew,
          handleTypingStart,
          handleTypingStop,
          handleMessageRead,
          handleNotificationNew,
          handleConversationNew,
          handleConversationUpdated,
          handleConversationRemoved,
          handleMessageDeleted,
          handleMessageRecalled
        };
      }

      return () => {
        if (socket) {
          const handlers = socketRef.current?.__chatUsersHandlers;
          if (handlers) {
            socket.off('message:new', handlers.handleMessageNew);
            socket.off('typing:start', handlers.handleTypingStart);
            socket.off('typing:stop', handlers.handleTypingStop);
            socket.off('message:read', handlers.handleMessageRead);
            socket.off('notification:new', handlers.handleNotificationNew);
            socket.off('conversation:new', handlers.handleConversationNew);
            socket.off('conversation:updated', handlers.handleConversationUpdated);
            socket.off('conversation:removed', handlers.handleConversationRemoved);
            socket.off('message:deleted', handlers.handleMessageDeleted);
            socket.off('message:recalled', handlers.handleMessageRecalled);
          }
        }
      };
    }
  }, [user, showParticipants]);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      fetchUnreadCount();
    }
  }, [isOpen]);

  // Listen for openChat event from profile page
  useEffect(() => {
    const handleOpenChat = async (event) => {
      const conversationId = event?.detail?.conversationId;
      if (!conversationId) return;

      setIsOpen(true);
      const latest = await fetchConversations(false);
      const conv = (latest || []).find((c) => idsEqual(c?._id, conversationId));
      if (conv) {
        setSelectedConversation(conv);
      }
    };

    const offOpenChat = onAppEvent('openChat', handleOpenChat);
    return () => offOpenChat();
  }, []);

  // Listen for openChatWindow event from header
  useEffect(() => {
    const handleOpenChatWindow = () => {
      setIsOpen(true);
      fetchConversations();
      fetchUnreadCount();
    };

    const offOpenChatWindow = onAppEvent('openChatWindow', handleOpenChatWindow);
    return () => offOpenChatWindow();
  }, []);

  // Open create-group modal directly from other widgets (e.g. Home sidebar)
  useEffect(() => {
    const handleOpenCreateGroupChat = () => {
      setIsOpen(true);
      setShowCreateGroup(true);
      fetchConversations(false);
      fetchUnreadCount();
    };

    const offOpenCreateGroupChat = onAppEvent('openCreateGroupChat', handleOpenCreateGroupChat);
    return () => offOpenCreateGroupChat();
  }, []);

  useEffect(() => {
    if (selectedConversation && socketRef.current) {
      fetchMessages(selectedConversation._id);
      markAsRead(selectedConversation._id);
      
      // Join conversation room
      socketRef.current.emit('conversation:join', selectedConversation._id);

      return () => {
        // Leave conversation room
        if (socketRef.current) {
          socketRef.current.emit('conversation:leave', selectedConversation._id);
        }
      };
    }
  }, [selectedConversation]);

  // Facebook-like auto update fallback:
  // Even if socket drops, keep chat data fresh without full page refresh.
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const activeConversationId = selectedConversationRef.current?._id;
      fetchConversations(false);
      fetchUnreadCount();

      if (activeConversationId) {
        fetchMessages(activeConversationId);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial fetch for unread count
  useEffect(() => {
      fetchUnreadCount();
      fetchBlockedUsers();
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const fetchBlockedUsers = async () => {
    try {
      const res = await api.get('/users/blocked');
      setBlockedUsers(res.data.blockedUsers || []);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/messages/unread/count');
      setUnreadCount(res.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchConversations = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const res = await api.get('/messages/conversations');
      const nextConversations = res.data.conversations || [];
      setConversations(nextConversations);
      return nextConversations;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const res = await api.get(`/messages/${conversationId}`);
      setMessages(res.data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markAsRead = async (conversationId) => {
    try {
      await api.put(`/messages/${conversationId}/read`);
      fetchUnreadCount();
      fetchConversations(false); // Don't show loading when marking as read
      // Dispatch event to update header unread count
      emitAppEvent('messagesRead');
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && selectedImages.length === 0 && selectedFiles.length === 0) || !selectedConversation) return;

    try {
      setUploading(true);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('content', newMessage.trim());

      // Add images
      selectedImages.forEach((file) => {
        formData.append('images', file);
      });

      // Add files
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const res = await api.post(`/messages/${selectedConversation._id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Message will be added via socket event, but add optimistically
      setMessages(prev => {
        if (prev.find((m) => idsEqual(m._id, res.data.message?._id))) {
          return prev;
        }
        return [...prev, res.data.message];
      });
      
      // Clear inputs
      setNewMessage('');
      setSelectedImages([]);
      setSelectedFiles([]);
      
      // Reset file inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
      
      // Stop typing indicator
      if (socketRef.current && selectedConversation) {
        socketRef.current.emit('typing:stop', {
          conversationId: selectedConversation._id
        });
      }
      
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      alert(error.response?.data?.message || 'Lỗi khi gửi tin nhắn');
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length + selectedImages.length > 10) {
      alert('Tối đa 10 ảnh');
      return;
    }
    
    setSelectedImages(prev => [...prev, ...imageFiles]);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + selectedFiles.length > 10) {
      alert('Tối đa 10 file');
      return;
    }
    
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const isVideoFile = (file) =>
    (file?.type && file.type.startsWith('video/')) ||
    /\.(mp4|webm|mov|mkv|avi|m4v|ogv|mpeg|mpg)$/i.test(file?.name || '');

  const isVideoAttachment = (file) => {
    const mime = file?.mimeType || '';
    if (mime.startsWith('video/')) return true;
    const name = file?.originalName || file?.name || '';
    const raw = file?.url || '';
    return /\.(mp4|webm|mov|mkv|avi|m4v|ogv|mpeg|mpg)$/i.test(name) || /\.(mp4|webm|mov|mkv|avi|m4v|ogv|mpeg|mpg)$/i.test(raw);
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!selectedConversation || !socketRef.current) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing start
    socketRef.current.emit('typing:start', {
      conversationId: selectedConversation._id,
      userId: user.id
    });

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit('typing:stop', {
          conversationId: selectedConversation._id
        });
      }
    }, 3000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getOtherParticipant = (conversation) => {
    if (conversation.type === 'group') {
      return null;
    }
    return conversation.participants?.find(p => p._id !== user.id);
  };

  const getConversationName = (conversation) => {
    if (conversation.type === 'group') {
      return conversation.name || 'Nhóm chat';
    }
    const otherUser = getOtherParticipant(conversation);
    return otherUser?.name || 'Người dùng';
  };

  const getConversationAvatar = (conversation) => {
    if (conversation.type === 'group') {
      return resolveAvatarUrl(conversation.avatar, conversation.name || 'Group', '10b981');
    }
    const otherUser = getOtherParticipant(conversation);
    return resolveAvatarUrl(otherUser?.avatar, otherUser?.name || 'User', '10b981');
  };

  const handleSearchUsers = async (query) => {
    setUserSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchUsers([]);
      return;
    }

    try {
      const res = await api.get(`/users/search?q=${query}&limit=10`);
      // Filter out already selected members and current user
      const filtered = (res.data.users || []).filter(
        u => u._id !== user.id && !selectedMembers.find(m => m._id === u._id)
      );
      setSearchUsers(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleAddMember = (userToAdd) => {
    if (!selectedMembers.find(m => m._id === userToAdd._id)) {
      setSelectedMembers([...selectedMembers, userToAdd]);
      setUserSearchQuery('');
      setSearchUsers([]);
    }
  };

  const handleRemoveMember = (userId) => {
    setSelectedMembers(selectedMembers.filter(m => m._id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert('Vui lòng nhập tên nhóm');
      return;
    }

    if (selectedMembers.length === 0) {
      alert('Vui lòng chọn ít nhất một thành viên');
      return;
    }

    try {
      setCreatingGroup(true);
      const res = await api.post('/messages/groups', {
        name: groupName.trim(),
        description: groupDescription.trim(),
        participantIds: selectedMembers.map(m => m._id)
      });

      // Add to conversations
      setConversations(prev => [res.data.conversation, ...prev]);
      setSelectedConversation(res.data.conversation);
      
      // Reset form
      setShowCreateGroup(false);
      setGroupName('');
      setGroupDescription('');
      setSelectedMembers([]);
      setUserSearchQuery('');
      setSearchUsers([]);
      emitAppEvent('messagesUpdated');
      emitAppEvent('chatGroupsUpdated');
    } catch (error) {
      console.error('Error creating group:', error);
      alert(error.response?.data?.message || 'Lỗi khi tạo nhóm');
    } finally {
      setCreatingGroup(false);
    }
  };

  const fetchGroupParticipants = async (conversationId) => {
    try {
      setLoadingParticipants(true);
      const res = await api.get(`/messages/groups/${conversationId}/participants`);
      setGroupParticipants(res.data.participants || []);
      setGroupInfo({
        name: res.data.name,
        description: res.data.description,
        createdBy: res.data.createdBy,
        admins: res.data.admins || []
      });
    } catch (error) {
      console.error('Error fetching participants:', error);
      alert(error.response?.data?.message || 'Lỗi khi lấy danh sách thành viên');
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleViewParticipants = () => {
    if (selectedConversation?.type === 'group') {
      fetchGroupParticipants(selectedConversation._id);
      setShowParticipants(true);
    }
  };

  const handlePickGroupAvatar = () => {
    if (!selectedConversation?._id) return;
    if (!isGroupAdmin()) {
      alert('Chỉ quản trị viên mới có thể đổi ảnh đại diện nhóm');
      return;
    }
    setShowGroupMenu(false);
    groupAvatarInputRef.current?.click?.();
  };

  const handleGroupAvatarSelected = async (e) => {
    try {
      const file = e.target?.files?.[0];
      if (!file || !selectedConversation?._id) return;
      if (!isGroupAdmin()) {
        alert('Chỉ quản trị viên mới có thể đổi ảnh đại diện nhóm');
        return;
      }

      if (!String(file.type || '').startsWith('image/')) {
        alert('Vui lòng chọn file ảnh');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Ảnh không được vượt quá 5MB');
        return;
      }

      const formData = new FormData();
      formData.append('images', file);

      const res = await api.put(`/messages/groups/${selectedConversation._id}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const updated = res.data?.conversation;
      if (updated?._id) {
        setSelectedConversation(updated);
        setConversations((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      }
      alert('✅ Đã cập nhật ảnh đại diện nhóm');
    } catch (error) {
      console.error('Error updating group avatar:', error);
      alert(error.response?.data?.message || 'Lỗi cập nhật ảnh đại diện nhóm');
    } finally {
      if (e?.target) e.target.value = '';
    }
  };

  const isAdmin = (userId) => {
    if (!groupInfo) return false;
    return groupInfo.admins?.some(admin => admin._id === userId) || 
           groupInfo.createdBy?._id === userId;
  };

  const isGroupAdmin = () => {
    if (!selectedConversation || selectedConversation.type !== 'group') return false;
    const currentUserId = user.id;
    // Check if user is in admins array (could be populated or just ID)
    const isInAdmins = selectedConversation.admins?.some(admin => {
      const adminId = typeof admin === 'object' ? admin._id : admin;
      return adminId?.toString() === currentUserId;
    });
    // Check if user is creator
    const isCreator = selectedConversation.createdBy?.toString() === currentUserId ||
                      (typeof selectedConversation.createdBy === 'object' && 
                       selectedConversation.createdBy?._id?.toString() === currentUserId);
    return isInAdmins || isCreator;
  };

  const isGroupCreator = () => {
    if (!selectedConversation || selectedConversation.type !== 'group') return false;
    const currentUserId = user.id;
    return selectedConversation.createdBy?.toString() === currentUserId ||
           (typeof selectedConversation.createdBy === 'object' && 
            selectedConversation.createdBy?._id?.toString() === currentUserId);
  };

  const handleAddMembersToGroup = async () => {
    if (selectedMembersToAdd.length === 0) {
      alert('Vui lòng chọn ít nhất một thành viên để thêm');
      return;
    }

    try {
      setAddingMembers(true);
      const res = await api.put(`/messages/groups/${selectedConversation._id}/participants`, {
        participantIds: selectedMembersToAdd.map(m => m._id)
      });

      // Update conversation
      setSelectedConversation(res.data.conversation);
      setConversations(prev => prev.map(c => 
        c._id === res.data.conversation._id ? res.data.conversation : c
      ));

      // Refresh participants if modal is open
      if (showParticipants) {
        fetchGroupParticipants(selectedConversation._id);
      }

      // Reset form
      setShowAddMembers(false);
      setSelectedMembersToAdd([]);
      setAddMembersSearchQuery('');
      setAddMembersSearchResults([]);
      alert('Đã thêm thành viên vào nhóm!');
    } catch (error) {
      console.error('Error adding members:', error);
      alert(error.response?.data?.message || 'Lỗi khi thêm thành viên');
    } finally {
      setAddingMembers(false);
    }
  };

  const handleSearchMembersToAdd = async (query) => {
    setAddMembersSearchQuery(query);
    if (query.trim().length < 2) {
      setAddMembersSearchResults([]);
      return;
    }

    try {
      const res = await api.get(`/users/search?q=${query}&limit=10`);
      // Filter out current participants and already selected members
      const currentParticipantIds = selectedConversation?.participants?.map(p => p._id || p) || [];
      const filtered = (res.data.users || []).filter(
        u => u._id !== user.id && 
             !currentParticipantIds.includes(u._id) &&
             !selectedMembersToAdd.find(m => m._id === u._id)
      );
      setAddMembersSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleAddMemberToGroup = (userToAdd) => {
    if (!selectedMembersToAdd.find(m => m._id === userToAdd._id)) {
      setSelectedMembersToAdd([...selectedMembersToAdd, userToAdd]);
      setAddMembersSearchQuery('');
      setAddMembersSearchResults([]);
    }
  };

  const handleRemoveMemberToAdd = (userId) => {
    setSelectedMembersToAdd(selectedMembersToAdd.filter(m => m._id !== userId));
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tin nhắn này?')) {
      return;
    }

    try {
      setDeletingMessageId(messageId);
      await api.delete(`/messages/delete/${messageId}`);
      
      // Message will be removed via socket event, but remove optimistically
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      
      // Refresh conversations to update lastMessage (silent update)
      fetchConversations(false);
    } catch (error) {
      console.error('Error deleting message:', error);
      alert(error.response?.data?.message || 'Lỗi khi xóa tin nhắn');
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleRecallMessage = async (messageId) => {
    if (!window.confirm('Bạn có chắc chắn muốn thu hồi tin nhắn này? Tin nhắn sẽ không thể xem được nữa.')) {
      return;
    }

    try {
      setRecallingMessageId(messageId);
      await api.put(`/messages/recall/${messageId}`);
      
      // Message will be updated via socket event, but update optimistically
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, isRecalled: true, recalledAt: new Date() } : msg
      ));
      
      // Refresh conversations to update lastMessage (silent update)
      fetchConversations(false);
    } catch (error) {
      console.error('Error recalling message:', error);
      alert(error.response?.data?.message || 'Lỗi khi thu hồi tin nhắn');
    } finally {
      setRecallingMessageId(null);
    }
  };

  const canRecallMessage = (message) => {
    if (!message || message.isRecalled) return false;
    if (message.sender?._id !== user.id) return false;
    
    // Check if message is within 15 minutes
    const messageTime = new Date(message.createdAt);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return messageTime >= fifteenMinutesAgo;
  };

  const canDeleteMessage = (message) => {
    if (!message) return false;
    
    // User can only delete their own messages
    return message.sender?._id === user.id;
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn rời nhóm này?')) {
      return;
    }

    try {
      await api.delete(`/messages/groups/${selectedConversation._id}/participants/${user.id}`);
      
      // Remove from conversations
      setConversations(prev => prev.filter(c => c._id !== selectedConversation._id));
      setSelectedConversation(null);
      setShowGroupMenu(false);
      alert('Bạn đã rời nhóm');
    } catch (error) {
      console.error('Error leaving group:', error);
      alert(error.response?.data?.message || 'Lỗi khi rời nhóm');
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa cuộc hội thoại này? Tất cả tin nhắn sẽ bị xóa vĩnh viễn.')) {
      return;
    }

    try {
      setDeletingConversationId(conversationId);
      await api.delete(`/messages/conversations/${conversationId}`);
      
      // Remove from conversations
      setConversations(prev => prev.filter(c => c._id !== conversationId));
      
      // Clear selected conversation if it's the deleted one
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(null);
      }
      
      setOpenConversationMenu(null);
      alert('Đã xóa cuộc hội thoại');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert(error.response?.data?.message || 'Lỗi khi xóa cuộc hội thoại');
    } finally {
      setDeletingConversationId(null);
    }
  };

  const handleBlockUser = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn chặn người dùng này? Bạn sẽ không thể nhận tin nhắn từ họ.')) {
      return;
    }

    try {
      setBlockingUserId(userId);
      await api.post(`/users/block/${userId}`);
      
      // Refresh conversations to get updated blocked status
      const res = await api.get('/messages/conversations');
      const updatedConversations = res.data.conversations || [];
      setConversations(updatedConversations);
      
      // Update selected conversation if it's with blocked user
      if (selectedConversation?.type === 'direct') {
        const otherUser = selectedConversation.participants?.find(p => p._id === userId);
        if (otherUser) {
          // Find updated conversation
          const updatedConv = updatedConversations.find(c => c._id === selectedConversation._id);
          if (updatedConv) {
            setSelectedConversation(updatedConv);
          }
        }
      }
      
      // Refresh blocked users list
      await fetchBlockedUsers();
      
      setOpenConversationMenu(null);
      setOpenParticipantMenu(null);
      alert('Đã chặn người dùng');
    } catch (error) {
      console.error('Error blocking user:', error);
      alert(error.response?.data?.message || 'Lỗi khi chặn người dùng');
    } finally {
      setBlockingUserId(null);
    }
  };

  const handleUnblockUser = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn bỏ chặn người dùng này?')) {
      return;
    }

    try {
      setBlockingUserId(userId);
      await api.delete(`/users/block/${userId}`);
      
      // Refresh conversations to get updated blocked status
      const res = await api.get('/messages/conversations');
      const updatedConversations = res.data.conversations || [];
      setConversations(updatedConversations);
      
      // Update selected conversation if it's with unblocked user
      if (selectedConversation?.type === 'direct') {
        const otherUser = selectedConversation.participants?.find(p => p._id === userId);
        if (otherUser) {
          // Find updated conversation
          const updatedConv = updatedConversations.find(c => c._id === selectedConversation._id);
          if (updatedConv) {
            setSelectedConversation(updatedConv);
          }
        }
      }
      
      // Refresh blocked users list
      await fetchBlockedUsers();
      
      setOpenConversationMenu(null);
      setOpenParticipantMenu(null);
      alert('Đã bỏ chặn người dùng');
    } catch (error) {
      console.error('Error unblocking user:', error);
      alert(error.response?.data?.message || 'Lỗi khi bỏ chặn người dùng');
    } finally {
      setBlockingUserId(null);
    }
  };

  const handleRemoveParticipant = async (participantId) => {
    if (!selectedConversation || selectedConversation.type !== 'group') return;
    
    const participant = groupParticipants.find(p => p._id === participantId);
    if (!participant) return;

    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${participant.name} khỏi nhóm này?`)) {
      return;
    }

    try {
      setRemovingParticipantId(participantId);
      await api.delete(`/messages/groups/${selectedConversation._id}/participants/${participantId}`);
      
      // Refresh participants list
      await fetchGroupParticipants(selectedConversation._id);
      
      // Refresh conversations (silent update)
      await fetchConversations(false);
      
      // Update selected conversation
      const res = await api.get('/messages/conversations');
      const updatedConversations = res.data.conversations || [];
      const updatedConv = updatedConversations.find(c => c._id === selectedConversation._id);
      if (updatedConv) {
        setSelectedConversation(updatedConv);
      }
      
      setOpenParticipantMenu(null);
      alert('Đã xóa thành viên khỏi nhóm');
    } catch (error) {
      console.error('Error removing participant:', error);
      alert(error.response?.data?.message || 'Lỗi khi xóa thành viên');
    } finally {
      setRemovingParticipantId(null);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowGroupMenu(false);
      }
      if (conversationMenuRef.current && !conversationMenuRef.current.contains(event.target)) {
        setOpenConversationMenu(null);
      }
      if (participantMenuRef.current && !participantMenuRef.current.contains(event.target)) {
        setOpenParticipantMenu(null);
      }
    };

    if (showGroupMenu || openConversationMenu || openParticipantMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGroupMenu, openConversationMenu, openParticipantMenu]);

  const getUnreadCountForConversation = (conversation) => {
    if (!conversation.lastMessage) return 0;
    if (conversation.lastMessage.sender?._id === user.id) return 0;
    if (conversation.lastMessage.isRead) return 0;
    return 1; // Simplified - just show if last message is unread
  };

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return conversations.filter((conv) => {
      // Search always runs globally across all conversations, regardless of selected tab.
      if (query) {
        const lastMessageText = String(conv?.lastMessage?.content || '').toLowerCase();
        if (conv.type === 'group') {
          const groupName = String(conv?.name || '').toLowerCase();
          return groupName.includes(query) || lastMessageText.includes(query);
        }
        const otherUser = getOtherParticipant(conv);
        const otherName = String(otherUser?.name || '').toLowerCase();
        return otherName.includes(query) || lastMessageText.includes(query);
      }

      // When there is no search query, use tab filters normally.
      if (conversationFilter === 'group' && conv.type !== 'group') {
        return false;
      }
      if (conversationFilter === 'unread') {
        const unread = getUnreadCountForConversation(conv);
        if (unread === 0) return false;
      }
      return true;
    });
  }, [conversations, conversationFilter, searchQuery, user.id]);

  return (
    <>
      {/* Floating Button - Hidden, using sidebar buttons instead */}
      {false && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="chat-button-fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center group"
          aria-label={`Tin nhắn${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ''}`}
        >
          <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          
          {/* Tooltip */}
          <div className="hidden sm:block absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Tin nhắn {unreadCount > 0 && `(${unreadCount} chưa đọc)`}
            <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900"></div>
          </div>
        </button>
      )}

      {/* Chat Window - Rendered via Portal to body */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="chat-window-fixed-absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-[var(--fb-surface)] text-[var(--fb-text-primary)] rounded-2xl shadow-2xl flex overflow-hidden border border-[var(--fb-divider)]"
          style={{ 
            '--chat-users-right': isNarrowViewport ? '1rem' : chatWindowRight,
            position: 'fixed',
            bottom: '1rem',
            right: isNarrowViewport ? '1rem' : chatWindowRight,
            /* Cùng kích thước khi xem danh sách hoặc đang chat — giống khung danh sách Messenger */
            width: '360px',
            maxWidth: 'min(360px, calc(100vw - 2rem))',
            height: '500px',
            maxHeight: 'min(500px, 90vh)',
            zIndex: 9999,
            transform: 'none',
            display: 'flex',
            flexDirection: 'row'
          }}
        >
          {/* Sidebar - Conversations List */}
          {!selectedConversation && (
            <div className="flex flex-col w-full border-r border-[var(--fb-divider)] bg-[var(--fb-surface)] flex-shrink-0 h-full">
            {/* Header */}
            <div className="bg-[#0084ff] text-white p-3 shadow-sm flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Chat</h3>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className="p-1.5 hover:bg-white hover:bg-opacity-10 rounded-full transition-colors"
                    title="Tạo nhóm"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                <button
                  onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-white hover:bg-opacity-10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                </div>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm trên Messenger"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white bg-opacity-10 border-0 rounded-lg text-white text-sm placeholder-gray-300 focus:outline-none focus:bg-opacity-20 transition-all"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-[var(--fb-surface)] px-3 py-2 flex items-center space-x-1 border-b border-[var(--fb-divider)] flex-shrink-0">
              <button
                onClick={() => setConversationFilter('all')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  conversationFilter === 'all'
                    ? 'bg-[#0084ff] text-white'
                    : 'text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setConversationFilter('unread')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  conversationFilter === 'unread'
                    ? 'bg-[#0084ff] text-white'
                    : 'text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
                }`}
              >
                Chưa đọc
              </button>
              <button
                onClick={() => setConversationFilter('group')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  conversationFilter === 'group'
                    ? 'bg-[#0084ff] text-white'
                    : 'text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
                }`}
              >
                Nhóm
              </button>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading && conversations.length === 0 ? (
                // Skeleton Loading
                <div className="space-y-0">
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="p-4 border-b border-gray-200 animate-pulse">
                      <div className="flex items-start space-x-3">
                        <div className="w-14 h-14 rounded-full bg-gray-300 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="h-4 bg-gray-300 rounded w-24"></div>
                            <div className="h-3 bg-gray-300 rounded w-12"></div>
                          </div>
                          <div className="h-3 bg-gray-300 rounded w-full mb-1"></div>
                          <div className="h-3 bg-gray-300 rounded w-32"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-12 text-center text-[var(--fb-text-secondary)]">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-100 to-teal-100 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-10 h-10 text-green-400" />
                  </div>
                  <p className="font-medium text-[var(--fb-text-primary)] mb-1">Chưa có cuộc hội thoại nào</p>
                  <p className="text-sm text-[var(--fb-text-secondary)] opacity-80">Nhấn vào profile người dùng để bắt đầu chat</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const unread = getUnreadCountForConversation(conv);
                  const isGroup = conv.type === 'group';
                  const otherUser = !isGroup ? getOtherParticipant(conv) : null;
                  
                  return (
                    <div
                      key={conv._id}
                      className={`p-3 border-b border-[var(--fb-divider)] hover:bg-[var(--fb-hover)] transition-colors cursor-pointer ${
                        selectedConversation?._id === conv._id ? 'bg-[var(--fb-input)]' : 'bg-[var(--fb-surface)]'
                      }`}
                          onClick={() => setSelectedConversation(conv)}
                        >
                          <div className="flex items-start space-x-3">
                        <div className="relative flex-shrink-0">
                            <div className="relative flex-shrink-0">
                              <img
                                src={getConversationAvatar(conv)}
                                alt={getConversationName(conv)}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                              {isGroup && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#0084ff] rounded-full flex items-center justify-center border-2 border-white">
                                <Users className="w-3 h-3 text-white" />
                                </div>
                              )}
                            {!isGroup && otherUser?.isOnline && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#31a24c] rounded-full border-2 border-white"></div>
                            )}
                              {unread > 0 && (
                              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#0084ff] text-white text-xs font-bold rounded-full flex items-center justify-center">
                                  {unread > 9 ? '9+' : unread}
                                </span>
                              )}
                          </div>
                            </div>
                            <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`truncate text-sm ${unread > 0 ? 'font-semibold text-[var(--fb-text-primary)]' : 'font-medium text-[var(--fb-text-primary)]'}`}>
                                  {getConversationName(conv)}
                                </p>
                                {conv.lastMessage && (
                              <span className="text-xs text-[var(--fb-text-secondary)] flex-shrink-0 ml-2">
                                    {formatTimeAgo(conv.lastMessageTime)}
                                  </span>
                                )}
                              </div>
                              {conv.lastMessage && (
                            <p className={`text-sm truncate ${unread > 0 ? 'font-medium text-[var(--fb-text-primary)]' : 'text-[var(--fb-text-secondary)]'}`}>
                                  {isGroup && conv.lastMessage.sender?._id !== user.id 
                                    ? `${conv.lastMessage.sender?.name}: ` 
                                    : conv.lastMessage.sender?._id === user.id 
                                      ? 'Bạn: ' 
                                      : ''}
                                  {lastMessagePreviewBody(conv.lastMessage)}
                                </p>
                              )}
                              {!isGroup && (
                                <div className="flex items-center space-x-2 mt-1">
                                  <p className="text-xs text-[var(--fb-text-secondary)]">{otherUser?.studentRole}</p>
                                  {conv.isBlocked && (
                                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium border border-red-200">
                                      Đã chặn
                                    </span>
                                  )}
                                </div>
                              )}
                              {isGroup && (
                                <p className="text-xs text-[var(--fb-text-secondary)] mt-1">{conv.participants?.length || 0} thành viên</p>
                              )}
                        </div>
                        <div className="relative flex-shrink-0" ref={openConversationMenu === conv._id ? conversationMenuRef : null}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenConversationMenu(openConversationMenu === conv._id ? null : conv._id);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
                            title="Tùy chọn"
                          >
                            <MoreVertical className="w-4 h-4 text-[var(--fb-icon)]" />
                          </button>
                          
                          {/* Dropdown Menu */}
                          {openConversationMenu === conv._id && (
                            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-100">
                              {/* Positive Actions */}
                              {!isGroup && otherUser && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/profile/${otherUser._id}`);
                                    setOpenConversationMenu(null);
                                  }}
                                  className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 group"
                                >
                                  <div className="p-1.5 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                                    <User className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <span className="font-medium">Xem trang cá nhân</span>
                                </button>
                              )}
                              
                              {/* Divider */}
                              {!isGroup && otherUser && (
                                <div className="border-t border-gray-100 my-1"></div>
                              )}
                              
                              {/* Neutral Actions */}
                              {!isGroup && otherUser && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (conv.isBlocked) {
                                      handleUnblockUser(otherUser._id);
                                    } else {
                                      handleBlockUser(otherUser._id);
                                    }
                                  }}
                                  disabled={blockingUserId === otherUser._id}
                                  className={`w-full flex items-center space-x-3 px-4 py-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group ${
                                    conv.isBlocked 
                                      ? 'text-green-700 hover:bg-green-50 hover:text-green-600' 
                                      : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                                  }`}
                                >
                                  <div className={`p-1.5 rounded-lg transition-colors ${
                                    conv.isBlocked 
                                      ? 'bg-green-100 group-hover:bg-green-200' 
                                      : 'bg-orange-100 group-hover:bg-orange-200'
                                  }`}>
                                    <Ban className={`w-4 h-4 ${
                                      conv.isBlocked ? 'text-green-600' : 'text-orange-600'
                                    }`} />
                                  </div>
                                  <span className="font-medium">{conv.isBlocked ? 'Bỏ chặn' : 'Chặn'}</span>
                                  {blockingUserId === otherUser._id && (
                                    <div className="ml-auto w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                  )}
                                </button>
                              )}
                              
                              {/* Divider before destructive action */}
                              <div className="border-t border-gray-100 my-1"></div>
                              
                              {/* Destructive Actions */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConversation(conv._id);
                                }}
                                disabled={deletingConversationId === conv._id}
                                className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                              >
                                <div className="p-1.5 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors">
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </div>
                                <span className="font-medium">Xóa đoạn chat</span>
                                {deletingConversationId === conv._id && (
                                  <div className="ml-auto w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          )}

          {/* Chat Area */}
          {selectedConversation && (
            <div className="flex-1 flex flex-col w-full min-w-0 h-full overflow-hidden">
              {/* Chat Header */}
              <div className="bg-[#0084ff] text-white p-3 flex items-center justify-between border-b border-[#0066cc] flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="p-1.5 hover:bg-white hover:bg-opacity-10 rounded-full transition-colors"
                    title="Quay lại danh sách chat"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    className={`flex items-center space-x-3 text-left rounded-lg -m-1 p-1 transition-colors ${
                      selectedConversation?.type !== 'group'
                        ? 'hover:bg-white hover:bg-opacity-10 cursor-pointer'
                        : 'cursor-default'
                    }`}
                    onClick={() => {
                      if (selectedConversation?.type === 'group') return;
                      const other = getOtherParticipant(selectedConversation);
                      const otherId = other?._id || other?.id;
                      if (otherId) navigate(`/profile/${otherId}`);
                    }}
                    title={selectedConversation?.type !== 'group' ? 'Xem trang cá nhân' : undefined}
                  >
                  <div className="relative">
                  <img
                    src={getConversationAvatar(selectedConversation)}
                    alt={getConversationName(selectedConversation)}
                      className="w-10 h-10 rounded-full"
                  />
                    {selectedConversation?.type !== 'group' && getOtherParticipant(selectedConversation)?.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#31a24c] rounded-full border-2 border-white"></div>
                      )}
                    </div>
                  <div>
                    <p className={`font-semibold text-sm ${selectedConversation?.type !== 'group' ? 'hover:underline' : ''}`}>{getConversationName(selectedConversation)}</p>
                    {selectedConversation?.type === 'group' ? (
                      <p className="text-xs text-blue-100">{selectedConversation.participants?.length || 0} thành viên</p>
                    ) : (
                      <p className="text-xs text-blue-100 flex items-center space-x-1">
                        {getOtherParticipant(selectedConversation)?.isOnline && (
                          <span className="w-1.5 h-1.5 bg-[#31a24c] rounded-full"></span>
                        )}
                        <span>{getOtherParticipant(selectedConversation)?.isOnline ? 'Đang hoạt động' : getOtherParticipant(selectedConversation)?.studentRole}</span>
                      </p>
                    )}
                  </div>
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedConversation?.type === 'group' ? (
                    <div className="relative" ref={menuRef}>
                      <input
                        ref={groupAvatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleGroupAvatarSelected}
                        className="hidden"
                      />
                      <button
                        onClick={() => setShowGroupMenu(!showGroupMenu)}
                        className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full transition-colors"
                        title="Tùy chọn nhóm"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {showGroupMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-lg shadow-xl z-50 overflow-hidden">
                          <button
                            onClick={() => {
                              handleViewParticipants();
                              setShowGroupMenu(false);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-white hover:bg-gray-700 transition-colors"
                          >
                            <Users className="w-5 h-5" />
                            <span>Thành viên</span>
                          </button>
                          {isGroupAdmin() && (
                            <button
                              onClick={handlePickGroupAvatar}
                              className="w-full flex items-center space-x-3 px-4 py-3 text-white hover:bg-gray-700 transition-colors"
                            >
                              <ImageIcon className="w-5 h-5" />
                              <span>Thêm ảnh</span>
                            </button>
                          )}
                          {isGroupAdmin() && (
                            <button
                              onClick={() => {
                                setShowAddMembers(true);
                                setShowGroupMenu(false);
                              }}
                              className="w-full flex items-center space-x-3 px-4 py-3 text-white hover:bg-gray-700 transition-colors"
                            >
                              <UserPlus className="w-5 h-5" />
                              <span>Thêm người</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              handleLeaveGroup();
                              setShowGroupMenu(false);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-white hover:bg-red-600 transition-colors"
                          >
                            <LogOut className="w-5 h-5" />
                            <span>Rời nhóm</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative" ref={userMenuRef}>
                      <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full transition-colors"
                        title="Tùy chọn"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {showUserMenu && getOtherParticipant(selectedConversation) && (
                        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-100">
                          {/* View Profile */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const otherUser = getOtherParticipant(selectedConversation);
                              if (otherUser) {
                                navigate(`/profile/${otherUser._id}`);
                                setShowUserMenu(false);
                              }
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 group"
                          >
                            <div className="p-1.5 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="font-medium">Xem trang cá nhân</span>
                          </button>
                          
                          {/* Divider */}
                          <div className="border-t border-gray-100 my-1"></div>
                          
                          {/* Block/Unblock */}
                          {getOtherParticipant(selectedConversation) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const otherUser = getOtherParticipant(selectedConversation);
                                if (otherUser) {
                                  if (selectedConversation?.isBlocked) {
                                    handleUnblockUser(otherUser._id);
                                  } else {
                                    handleBlockUser(otherUser._id);
                                  }
                                  setShowUserMenu(false);
                                }
                              }}
                              disabled={blockingUserId === getOtherParticipant(selectedConversation)?._id}
                              className={`w-full flex items-center space-x-3 px-4 py-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group ${
                                selectedConversation?.isBlocked 
                                  ? 'text-green-700 hover:bg-green-50 hover:text-green-600' 
                                  : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                              }`}
                            >
                              <div className={`p-1.5 rounded-lg transition-colors ${
                                selectedConversation?.isBlocked 
                                  ? 'bg-green-100 group-hover:bg-green-200' 
                                  : 'bg-orange-100 group-hover:bg-orange-200'
                              }`}>
                                <Ban className={`w-4 h-4 ${
                                  selectedConversation?.isBlocked ? 'text-green-600' : 'text-orange-600'
                                }`} />
                              </div>
                              <span className="font-medium">{selectedConversation?.isBlocked ? 'Bỏ chặn' : 'Chặn'}</span>
                              {blockingUserId === getOtherParticipant(selectedConversation)?._id && (
                                <div className="ml-auto w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#f0f2f5]">
                {messages.map((msg) => {
                  const isOwn = msg.sender?._id === user.id;
                  const eventShare =
                    msg.content && !msg.isRecalled ? parseEventShareFromMessage(msg.content) : null;
                  const groupShare =
                    msg.content && !msg.isRecalled && !eventShare
                      ? parseGroupShareFromMessage(msg.content)
                      : null;
                  const shareTarget =
                    msg.content && !msg.isRecalled && !eventShare && !groupShare
                      ? extractShareTargetFromMessage(msg.content)
                      : null;
                  const shareBodyText =
                    shareTarget && msg.content ? stripTrailingShareUrl(msg.content) : '';

                  const canDelete = canDeleteMessage(msg);
                  const canRecall = canRecallMessage(msg);
                  
                  return (
                    <div
                      key={msg._id}
                      className={`flex items-end space-x-2 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''} group`}
                      onMouseEnter={() => setHoveredMessageId(msg._id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      {!isOwn && (
                        <img
                          src={resolveAvatarUrl(msg.sender?.avatar, msg.sender?.name, '10b981')}
                          alt={msg.sender?.name}
                          className="w-8 h-8 rounded-full"
                          onError={withAvatarFallback(msg.sender?.name, '10b981')}
                        />
                      )}
                      <div
                        className={`flex flex-col ${isOwn ? 'items-end' : ''} ${
                          eventShare || groupShare
                            ? 'max-w-[min(280px,calc(100%-2.75rem))]'
                            : 'max-w-[min(17rem,calc(100%-2.75rem))]'
                        }`}
                      >
                        {/* Show sender name in group messages */}
                        {!isOwn && selectedConversation?.type === 'group' && (
                          <p className="text-xs font-semibold text-gray-700 mb-1 px-2">{msg.sender?.name}</p>
                        )}
                        <div
                          className={`rounded-2xl relative ${
                            eventShare || groupShare ? 'px-1 py-1' : 'px-3 py-1.5'
                          } ${
                            isOwn
                              ? msg.isRecalled 
                                ? 'bg-gray-300 text-gray-600' 
                                : 'bg-[#0084ff] text-white'
                              : msg.isRecalled
                                ? 'bg-gray-200 text-gray-500'
                                : 'bg-[#e4e6eb] text-gray-900'
                          }`}
                        >
                          {msg.isRecalled ? (
                            <div className="flex items-center space-x-2 italic">
                              <RotateCcw className="w-4 h-4" />
                              <p className="text-sm">Tin nhắn đã được thu hồi</p>
                            </div>
                          ) : (
                            <>
                              {/* Images */}
                              {msg.images && msg.images.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  {msg.images.map((img, idx) => (
                                    <a
                                      key={idx}
                                      href={`http://localhost:5000${img.url}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="relative group"
                                    >
                                      <img
                                        src={`http://localhost:5000${img.url}`}
                                        alt={img.originalName || 'Image'}
                                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                                      />
                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-opacity"></div>
                                    </a>
                                  ))}
                                </div>
                              )}
                              
                              {/* Files */}
                              {msg.files && msg.files.length > 0 && (
                                <div className="space-y-2 mb-2">
                                  {msg.files.map((file, idx) =>
                                    isVideoAttachment(file) ? (
                                      <div
                                        key={idx}
                                        className={`rounded-lg overflow-hidden ${
                                          isOwn ? 'bg-white/15' : 'bg-gray-100'
                                        }`}
                                      >
                                        <video
                                          src={`http://localhost:5000${file.url}`}
                                          className="w-full max-h-48 object-contain bg-black/80"
                                          controls
                                          playsInline
                                          preload="metadata"
                                        />
                                        <div className="flex items-center gap-2 px-2 py-1.5">
                                          <Film className="w-4 h-4 flex-shrink-0 opacity-80" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">{file.originalName}</p>
                                            <p className="text-[10px] opacity-75">{formatFileSize(file.size)}</p>
                                          </div>
                                          <a
                                            href={`http://localhost:5000${file.url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[11px] font-semibold text-blue-600 hover:underline flex-shrink-0"
                                          >
                                            Mở
                                          </a>
                                        </div>
                                      </div>
                                    ) : (
                                      <a
                                        key={idx}
                                        href={`http://localhost:5000${file.url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center space-x-2 p-2 rounded-lg ${
                                          isOwn ? 'bg-white bg-opacity-20' : 'bg-gray-100'
                                        } hover:opacity-80 transition-opacity`}
                                      >
                                        <FileText className="w-5 h-5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">{file.originalName}</p>
                                          <p className="text-xs opacity-75">{formatFileSize(file.size)}</p>
                                        </div>
                                      </a>
                                    )
                                  )}
                                </div>
                              )}
                              
                              {/* Text / thẻ chia sẻ sự kiện / tin chia sẻ bài */}
                              {msg.content && (
                                eventShare ? (
                                  <>
                                    {eventShare.caption ? (
                                      <p
                                        className={`mb-2 px-2 text-sm leading-relaxed whitespace-pre-wrap ${
                                          isOwn ? 'text-white/95' : 'text-gray-800'
                                        }`}
                                      >
                                        {renderTextWithClickableUrls(eventShare.caption, isOwn)}
                                      </p>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/events/${eventShare.eventId}`)}
                                      className={`block w-full overflow-hidden rounded-2xl text-left shadow-md transition hover:opacity-[0.98] ${
                                        isOwn ? 'ring-1 ring-white/40' : 'border border-gray-200/90'
                                      }`}
                                    >
                                      <div className="relative h-[140px] w-full bg-gradient-to-br from-slate-200 to-slate-300">
                                        {eventShare.image ? (
                                          <img
                                            src={resolveEventShareImageUrl(eventShare.image)}
                                            alt=""
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                                            <Calendar className="h-14 w-14 text-white/50" />
                                          </div>
                                        )}
                                      </div>
                                      <div className={`px-3.5 py-3 ${isOwn ? 'bg-white' : 'bg-[#f0f2f5]'}`}>
                                        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900">
                                          {eventShare.title}
                                        </p>
                                        <p className="mt-1 text-sm text-gray-500">
                                          {formatEventShareCardDate(eventShare.date)}
                                        </p>
                                        {eventShare.location ? (
                                          <p className="mt-0.5 truncate text-xs text-gray-500">
                                            {eventShare.location}
                                          </p>
                                        ) : null}
                                      </div>
                                    </button>
                                  </>
                                ) : groupShare ? (
                                  <>
                                    {groupShare.caption ? (
                                      <p
                                        className={`mb-2 px-2 text-sm leading-relaxed whitespace-pre-wrap ${
                                          isOwn ? 'text-white/95' : 'text-gray-800'
                                        }`}
                                      >
                                        {renderTextWithClickableUrls(groupShare.caption, isOwn)}
                                      </p>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/groups/${groupShare.groupId}`)}
                                      className={`block w-full overflow-hidden rounded-2xl text-left shadow-md transition hover:opacity-[0.98] ${
                                        isOwn ? 'ring-1 ring-white/40' : 'border border-gray-200/90'
                                      }`}
                                    >
                                      <div className="relative h-[140px] w-full bg-gradient-to-br from-slate-200 to-slate-300">
                                        {groupShare.image ? (
                                          <img
                                            src={resolveGroupShareImageUrl(groupShare.image)}
                                            alt=""
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                                            <Users className="h-14 w-14 text-white/50" />
                                          </div>
                                        )}
                                      </div>
                                      <div className={`px-3.5 py-3 ${isOwn ? 'bg-white' : 'bg-[#f0f2f5]'}`}>
                                        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900">
                                          {groupShare.title}
                                        </p>
                                        <p className="mt-1 text-sm text-gray-500">
                                          {formatGroupShareCardSubtitle(groupShare)}
                                        </p>
                                      </div>
                                    </button>
                                  </>
                                ) : shareTarget ? (
                                  <>
                                    {shareBodyText ? (
                                      <p className="text-sm whitespace-pre-wrap leading-relaxed mb-2">
                                        {renderTextWithClickableUrls(shareBodyText, isOwn)}
                                      </p>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (shareTarget.kind === 'group') {
                                          navigate(`/groups/${shareTarget.groupId}?post=${shareTarget.postId}`);
                                        } else {
                                          navigate(`/home?post=${shareTarget.postId}`);
                                        }
                                      }}
                                      className={`flex items-center gap-2 w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                                        isOwn
                                          ? 'bg-white/20 hover:bg-white/30 text-white'
                                          : 'bg-white shadow-sm border border-gray-200/80 hover:bg-blue-50 text-blue-700'
                                      }`}
                                    >
                                      <ExternalLink className="w-4 h-4 flex-shrink-0 opacity-90" />
                                      <span>Xem bài viết được chia sẻ</span>
                                    </button>
                                    <a
                                      href={
                                        shareTarget.kind === 'group'
                                          ? `/groups/${shareTarget.groupId}?post=${shareTarget.postId}`
                                          : `/home?post=${shareTarget.postId}`
                                      }
                                      onClick={(e) => {
                                        e.preventDefault();
                                        if (shareTarget.kind === 'group') {
                                          navigate(`/groups/${shareTarget.groupId}?post=${shareTarget.postId}`);
                                        } else {
                                          navigate(`/home?post=${shareTarget.postId}`);
                                        }
                                      }}
                                      className={`block text-xs font-medium underline break-all mt-1.5 ${
                                        isOwn ? 'text-blue-50 hover:text-white' : 'text-blue-700 hover:text-blue-900'
                                      }`}
                                    >
                                      {typeof window !== 'undefined'
                                        ? `${window.location.origin}${
                                            shareTarget.kind === 'group'
                                              ? `/groups/${shareTarget.groupId}?post=${shareTarget.postId}`
                                              : `/home?post=${shareTarget.postId}`
                                          }`
                                        : shareTarget.kind === 'group'
                                          ? `/groups/${shareTarget.groupId}?post=${shareTarget.postId}`
                                          : `/home?post=${shareTarget.postId}`}
                                    </a>
                                  </>
                                ) : (
                                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                    {renderTextWithClickableUrls(msg.content, isOwn)}
                                  </p>
                                )
                              )}
                              
                              {/* Show icon if only files/images without text */}
                              {!msg.content && (msg.images?.length > 0 || msg.files?.length > 0) && (
                                <div className="flex items-center space-x-1 text-xs opacity-75">
                                  {msg.images?.length > 0 && <ImageIcon className="w-4 h-4" />}
                                  {msg.files?.length > 0 && <FileText className="w-4 h-4" />}
                            </div>
                              )}
                            </>
                          )}
                        </div>
                        <div className={`flex items-center space-x-1 mt-0.5 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                          {isOwn && (
                            msg.isRead ? (
                              <CheckCheck className="w-3 h-3 text-blue-500" />
                            ) : (
                              <Check className="w-3 h-3 text-gray-400" />
                            )
                          )}
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(msg.createdAt)}
                          </span>
                          {/* Action buttons - only show on hover */}
                          {hoveredMessageId === msg._id && (
                            <div className={`flex items-center space-x-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                              {/* Recall button - only for own messages that can be recalled */}
                              {canRecall && (
                                <button
                                  onClick={() => handleRecallMessage(msg._id)}
                                  disabled={recallingMessageId === msg._id}
                                  className="p-1 rounded-full transition-colors hover:bg-orange-100 text-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Thu hồi tin nhắn"
                                >
                                  {recallingMessageId === msg._id ? (
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <RotateCcw className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                              {/* Delete button - only show if user can delete */}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteMessage(msg._id)}
                                  disabled={deletingMessageId === msg._id}
                                  className={`p-1 rounded-full transition-colors ${
                                    isOwn
                                      ? 'hover:bg-white hover:bg-opacity-20 text-white'
                                      : 'hover:bg-red-100 text-red-500'
                                  } ${deletingMessageId === msg._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  title="Xóa tin nhắn"
                                >
                                  {deletingMessageId === msg._id ? (
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Typing Indicator */}
                {typingUsers.size > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="bg-[#e4e6eb] px-4 py-2 rounded-2xl">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Blocked User Notice */}
              {selectedConversation?.isBlocked && selectedConversation?.type === 'direct' && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-200">
                  <p className="text-sm text-red-600 flex items-center space-x-2">
                    <Ban className="w-4 h-4" />
                    <span>Bạn đã chặn người dùng này. Bạn không thể gửi tin nhắn.</span>
                  </p>
                </div>
              )}

              {/* Input */}
              <div className={`p-3 bg-white border-t border-gray-200 flex-shrink-0 ${selectedConversation?.isBlocked && selectedConversation?.type === 'direct' ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Preview selected files */}
                {(selectedImages.length > 0 || selectedFiles.length > 0) && (
                  <div className="mb-3 space-y-2">
                    {/* Preview images */}
                    {selectedImages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedImages.map((file, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => removeImage(idx)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Preview files */}
                    {selectedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedFiles.map((file, idx) => (
                          <div
                            key={`${file.name}-${file.size}-${idx}`}
                            className="relative group flex flex-col gap-1 bg-gray-100 px-2 py-2 rounded-lg max-w-[220px]"
                          >
                            {isVideoFile(file) ? (
                              <div className="relative rounded-lg overflow-hidden bg-black/80">
                                <ChatLocalVideoPreview file={file} />
                                <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                                  <Film className="w-3 h-3" />
                                  <span>Video</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{file.name}</p>
                                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                </div>
                              </div>
                            )}
                            {isVideoFile(file) ? (
                              <div className="flex items-center justify-between gap-1 px-0.5">
                                <p className="text-[10px] font-medium truncate text-gray-700 flex-1" title={file.name}>
                                  {file.name}
                                </p>
                                <p className="text-[10px] text-gray-500 flex-shrink-0">{formatFileSize(file.size)}</p>
                              </div>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                              aria-label="Bỏ file"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  {/* File upload buttons */}
                  <div className="flex items-center space-x-1">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="Gửi ảnh"
                    >
                      <ImageIcon className="w-5 h-5 text-gray-600" />
                    </button>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={CHAT_FILE_ACCEPT}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="Gửi file hoặc video"
                    >
                      <Paperclip className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                  
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="Aa"
                    className="flex-1 px-4 py-2 bg-[#f0f2f5] border-0 rounded-full focus:outline-none text-sm"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && selectedImages.length === 0 && selectedFiles.length === 0) || uploading || (selectedConversation?.isBlocked && selectedConversation?.type === 'direct')}
                    className="w-9 h-9 bg-[#0084ff] text-white rounded-full hover:bg-[#0066cc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ml-2"
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                    <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Create Group Modal - Rendered via Portal to body */}
      {showCreateGroup && typeof document !== 'undefined' && createPortal(
        <div 
          className="chat-window-fixed-absolute bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
          style={{ 
            position: 'fixed',
            bottom: '1rem',
            right: isNarrowViewport
              ? '1rem'
              : isOpen
                ? (selectedConversation ? `calc(${chatWindowRight} + 400px + ${chatGap})` : `calc(${chatWindowRight} + 360px + ${chatGap})`)
                : `calc(${chatWindowRight} + 360px + ${chatGap})`,
            width: '400px',
            maxWidth: 'min(400px, calc(100vw - 2rem))',
            height: '600px',
            maxHeight: '90vh',
            zIndex: 9998,
            transform: 'none',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
            {/* Header */}
          <div className="bg-[#0084ff] text-white p-3 flex items-center justify-between flex-shrink-0">
            <h3 className="font-semibold text-lg">Tạo nhóm chat</h3>
              <button
                onClick={() => {
                  setShowCreateGroup(false);
                  setGroupName('');
                  setGroupDescription('');
                  setSelectedMembers([]);
                  setUserSearchQuery('');
                  setSearchUsers([]);
                }}
              className="p-1.5 hover:bg-white hover:bg-opacity-10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Group Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên nhóm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Nhập tên nhóm"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0084ff]"
                />
              </div>

              {/* Group Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả (tùy chọn)
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Nhập mô tả nhóm"
                  rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0084ff] resize-none"
                />
              </div>

              {/* Selected Members */}
              {selectedMembers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thành viên đã chọn ({selectedMembers.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg"
                      >
                        <img
                          src={resolveAvatarUrl(member.avatar, member.name, '10b981')}
                          alt={member.name}
                          className="w-6 h-6 rounded-full"
                          onError={withAvatarFallback(member.name, '10b981')}
                        />
                        <span className="text-sm font-medium text-gray-700">{member.name}</span>
                        <button
                          onClick={() => handleRemoveMember(member._id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Users */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tìm kiếm thành viên
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    placeholder="Tìm kiếm theo tên, email..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0084ff]"
                  />
                </div>

                {/* Search Results */}
                {userSearchQuery.trim().length >= 2 && searchUsers.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {searchUsers.map((userResult) => (
                      <div
                        key={userResult._id}
                        onClick={() => handleAddMember(userResult)}
                        className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <img
                          src={resolveAvatarUrl(userResult.avatar, userResult.name, '10b981')}
                          alt={userResult.name}
                          className="w-10 h-10 rounded-full"
                          onError={withAvatarFallback(userResult.name, '10b981')}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{userResult.name}</p>
                          <p className="text-xs text-gray-500">{userResult.studentRole}</p>
                        </div>
                        <Plus className="w-5 h-5 text-green-500" />
                      </div>
                    ))}
                  </div>
                )}

                {userSearchQuery.trim().length >= 2 && searchUsers.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500 text-center py-2">
                    Không tìm thấy người dùng
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateGroup(false);
                  setGroupName('');
                  setGroupDescription('');
                  setSelectedMembers([]);
                  setUserSearchQuery('');
                  setSearchUsers([]);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={creatingGroup || !groupName.trim() || selectedMembers.length === 0}
                className="px-4 py-2 bg-[#0084ff] text-white rounded-lg hover:bg-[#0066cc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {creatingGroup ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  <span>Tạo nhóm</span>
                )}
              </button>
            </div>
        </div>,
        document.body
      )}

      {/* View Participants Modal */}
      {showParticipants && selectedConversation?.type === 'group' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Thành viên nhóm</h3>
                {groupInfo && (
                  <p className="text-sm text-green-100 mt-1">{groupInfo.name}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowParticipants(false);
                  setGroupParticipants([]);
                  setGroupInfo(null);
                }}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingParticipants ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  {/* Group Description */}
                  {groupInfo?.description && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{groupInfo.description}</p>
                    </div>
                  )}

                  {/* Participants Count */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700">
                      {groupParticipants.length} thành viên
                    </p>
                  </div>

                  {/* Participants List */}
                  <div className="space-y-2">
                    {groupParticipants.map((participant) => {
                      const isCurrentUser = participant._id === user.id;
                      const isGroupAdmin = isAdmin(participant._id);
                      const isCreator = groupInfo?.createdBy?._id === participant._id;
                      const isBlocked = blockedUsers.some(bu => bu._id === participant._id);
                      const canRemoveParticipant = isGroupCreator() && !isCreator && !isCurrentUser;

                      return (
                        <div
                          key={participant._id}
                          className={`flex items-center space-x-3 p-4 rounded-lg group hover:bg-gray-100 transition-all duration-200 ${
                            isCurrentUser ? 'bg-green-50' : 'bg-gray-50'
                          }`}
                        >
                          <div className="relative flex-shrink-0">
                            <img
                              src={resolveAvatarUrl(participant.avatar, participant.name, '10b981')}
                              alt={participant.name}
                              className="w-14 h-14 rounded-full ring-2 ring-gray-200 group-hover:ring-green-400 transition-all"
                              onError={withAvatarFallback(participant.name, '10b981')}
                            />
                            {participant.isOnline && (
                              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-md"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className={`font-semibold truncate text-base ${isCurrentUser ? 'text-green-700' : 'text-gray-800'}`}>
                                {participant.name}
                                {isCurrentUser && <span className="text-green-600"> (Bạn)</span>}
                              </p>
                              {isCreator && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                  Người tạo
                                </span>
                              )}
                              {isGroupAdmin && !isCreator && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                                  Quản trị viên
                                </span>
                              )}
                              {isBlocked && !isCurrentUser && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full border border-red-200">
                                  Đã chặn
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 truncate">{participant.studentRole}</p>
                            {participant.major && (
                              <p className="text-xs text-gray-500 truncate">{participant.major}</p>
                            )}
                            {participant.isOnline ? (
                              <p className="text-xs text-green-600 mt-1 font-medium">Đang hoạt động</p>
                            ) : participant.lastActive && (
                              <p className="text-xs text-gray-500 mt-1">
                                Hoạt động {formatTimeAgo(participant.lastActive)}
                              </p>
                            )}
                          </div>
                          {!isCurrentUser && (
                            <div className="relative flex-shrink-0" ref={openParticipantMenu === participant._id ? participantMenuRef : null}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenParticipantMenu(openParticipantMenu === participant._id ? null : participant._id);
                                }}
                                className="p-2 hover:bg-gray-200 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
                                title="Tùy chọn"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-600" />
                              </button>
                              
                              {/* Dropdown Menu */}
                              {openParticipantMenu === participant._id && (
                                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-100">
                                  {/* Positive Actions */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/profile/${participant._id}`);
                                      setOpenParticipantMenu(null);
                                    }}
                                    className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 group"
                                  >
                                    <div className="p-1.5 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                                      <User className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <span className="font-medium">Xem trang cá nhân</span>
                                  </button>
                                  
                                  {/* Divider */}
                                  <div className="border-t border-gray-100 my-1"></div>
                                  
                                  {/* Neutral Actions */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isBlocked) {
                                        handleUnblockUser(participant._id);
                                      } else {
                                        handleBlockUser(participant._id);
                                      }
                                    }}
                                    disabled={blockingUserId === participant._id}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group ${
                                      isBlocked 
                                        ? 'text-green-700 hover:bg-green-50 hover:text-green-600' 
                                        : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                                    }`}
                                  >
                                    <div className={`p-1.5 rounded-lg transition-colors ${
                                      isBlocked 
                                        ? 'bg-green-100 group-hover:bg-green-200' 
                                        : 'bg-orange-100 group-hover:bg-orange-200'
                                    }`}>
                                      <Ban className={`w-4 h-4 ${
                                        isBlocked ? 'text-green-600' : 'text-orange-600'
                                      }`} />
                                    </div>
                                    <span className="font-medium">{isBlocked ? 'Bỏ chặn' : 'Chặn'}</span>
                                    {blockingUserId === participant._id && (
                                      <div className="ml-auto w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                    )}
                                  </button>
                                  
                                  {/* Divider before destructive action */}
                                  {canRemoveParticipant && (
                                    <div className="border-t border-gray-100 my-1"></div>
                                  )}
                                  
                                  {/* Destructive Actions - Only for group creator */}
                                  {canRemoveParticipant && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveParticipant(participant._id);
                                      }}
                                      disabled={removingParticipantId === participant._id}
                                      className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                                    >
                                      <div className="p-1.5 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors">
                                        <UserMinus className="w-4 h-4 text-red-600" />
                                      </div>
                                      <span className="font-medium">Xóa khỏi nhóm</span>
                                      {removingParticipantId === participant._id && (
                                        <div className="ml-auto w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                      )}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Group Info Footer */}
                  {groupInfo?.createdBy && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Nhóm được tạo bởi{' '}
                        <span className="font-medium text-gray-700">
                          {groupInfo.createdBy.name}
                        </span>
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowParticipants(false);
                  setGroupParticipants([]);
                  setGroupInfo(null);
                }}
                className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Members Modal */}
      {showAddMembers && selectedConversation?.type === 'group' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Thêm thành viên</h3>
                <p className="text-sm text-green-100 mt-1">{selectedConversation.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAddMembers(false);
                  setSelectedMembersToAdd([]);
                  setAddMembersSearchQuery('');
                  setAddMembersSearchResults([]);
                }}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Selected Members */}
              {selectedMembersToAdd.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thành viên đã chọn ({selectedMembersToAdd.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembersToAdd.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg"
                      >
                        <img
                          src={resolveAvatarUrl(member.avatar, member.name, '10b981')}
                          alt={member.name}
                          className="w-6 h-6 rounded-full"
                          onError={withAvatarFallback(member.name, '10b981')}
                        />
                        <span className="text-sm font-medium text-gray-700">{member.name}</span>
                        <button
                          onClick={() => handleRemoveMemberToAdd(member._id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Users */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tìm kiếm thành viên
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={addMembersSearchQuery}
                    onChange={(e) => handleSearchMembersToAdd(e.target.value)}
                    placeholder="Tìm kiếm theo tên, email..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Search Results */}
                {addMembersSearchQuery.trim().length >= 2 && addMembersSearchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {addMembersSearchResults.map((userResult) => (
                      <div
                        key={userResult._id}
                        onClick={() => handleAddMemberToGroup(userResult)}
                        className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <img
                          src={resolveAvatarUrl(userResult.avatar, userResult.name, '10b981')}
                          alt={userResult.name}
                          className="w-10 h-10 rounded-full"
                          onError={withAvatarFallback(userResult.name, '10b981')}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{userResult.name}</p>
                          <p className="text-xs text-gray-500">{userResult.studentRole}</p>
                        </div>
                        <Plus className="w-5 h-5 text-green-500" />
                      </div>
                    ))}
                  </div>
                )}

                {addMembersSearchQuery.trim().length >= 2 && addMembersSearchResults.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500 text-center py-2">
                    Không tìm thấy người dùng hoặc đã là thành viên
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddMembers(false);
                  setSelectedMembersToAdd([]);
                  setAddMembersSearchQuery('');
                  setAddMembersSearchResults([]);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleAddMembersToGroup}
                disabled={addingMembers || selectedMembersToAdd.length === 0}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {addingMembers ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang thêm...</span>
                  </>
                ) : (
                  <span>Thêm thành viên</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatUsers;

