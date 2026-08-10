'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Phone,
  Video,
  User,
  Circle,
  Search,
  Send,
  Paperclip,
  PhoneOff,
  Sun,
  Moon,
  LogOut,
  Camera,
  X,
  CheckCircle2,
  ArrowLeft,
  UserPlus,
  Clock,
  Check,
  CheckCheck,
  UserX,
  Bell,
  MoreVertical,
  Reply,
  Trash2,
  CornerDownRight,
  Share2,
  PhoneIncoming,
  PhoneCall,
  Mic,
  Square,
  Volume2
} from 'lucide-react';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'hp0bmfy7';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

export default function App() {
  const [theme, setTheme] = useState('dark');

  // Auth States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('register');
  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    password: ''
  });

  const [currentUser, setCurrentUser] = useState({
    id: null,
    username: '',
    email: '',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'Hey there! I am using Chatrio by ED 🚀'
  });

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState('chats');
  const [activeChat, setActiveChat] = useState(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // Search & Friend Requests States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);

  // Status & Calls States
  const [showCreateStatusModal, setShowCreateStatusModal] = useState(false);
  const [activeStatusViewer, setActiveStatusViewer] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [incomingCallAlert, setIncomingCallAlert] = useState(null);

  // Audio Note / Voice Message States
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  // Input & Messaging States
  const [messageInput, setMessageInput] = useState('');
  const [statusTextInput, setStatusTextInput] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [contextMenuMsg, setContextMenuMsg] = useState(null);
  const [forwardModalMsg, setForwardModalMsg] = useState(null);

  const chatMessagesEndRef = useRef(null);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    bio: ''
  });

  // Main Lists States
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [callLogs, setCallLogs] = useState([]);

  const queryNeon = async (sql, params = []) => {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || `Database Error (${res.status})`;
        console.error('Neon DB query error:', res.status, errMsg);
        showToast(`DB Error: ${errMsg}`);
        return null;
      }
      return await res.json();
    } catch (err) {
      console.warn('Neon DB endpoint fetch error:', err);
      showToast('Network error connecting to database');
      return null;
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diffInSeconds = Math.floor((new Date() - date) / 1000);

    if (diffInSeconds < 15) return 'just now';
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatLastSeen = (lastSeenTime) => {
    if (!lastSeenTime) return 'Offline';
    const diffInSeconds = Math.floor((new Date() - new Date(lastSeenTime)) / 1000);

    if (diffInSeconds < 20) return 'Active Now';
    if (diffInSeconds < 60) return 'Last seen just now';
    if (diffInSeconds < 3600) return `Last seen ${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `Last seen ${Math.floor(diffInSeconds / 3600)}h ago`;

    const d = new Date(lastSeenTime);
    return `Last seen ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4500);
  };

  useEffect(() => {
    document.title = 'Chatrio by ED';

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    try {
      const savedUser = localStorage.getItem('chatrio_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setCurrentUser(parsedUser);
        setProfileForm({
          username: parsedUser.username || '',
          email: parsedUser.email || '',
          bio: parsedUser.bio || 'Hey there! I am using Chatrio by ED 🚀'
        });
        setIsLoggedIn(true);
      }
    } catch (err) {
      console.error('Session load error:', err);
    }
  }, [theme]);

  // Heartbeat Online Sync
  useEffect(() => {
    if (!currentUser.id) return;

    const updateHeartbeat = async () => {
      await queryNeon(`UPDATE users SET last_seen = NOW() WHERE id = $1`, [currentUser.id]);
    };

    updateHeartbeat();
    const heartbeatInterval = setInterval(updateHeartbeat, 10000);
    return () => clearInterval(heartbeatInterval);
  }, [currentUser.id]);

  // Real-time Incoming Call Polling
  useEffect(() => {
    if (!currentUser.id) return;

    const pollIncomingCalls = async () => {
      const res = await queryNeon(
        `SELECT c.id as call_id, c.caller_id, c.call_type, c.status, u.username as caller_name, u.avatar as caller_avatar
         FROM calls c
         JOIN users u ON c.caller_id = u.id
         WHERE c.receiver_id = $1 AND c.status = 'ringing'
         ORDER BY c.id DESC LIMIT 1`,
        [currentUser.id]
      );

      if (res && res.rows && res.rows.length > 0) {
        setIncomingCallAlert(res.rows[0]);
      } else {
        setIncomingCallAlert(null);
      }
    };

    pollIncomingCalls();
    const callInterval = setInterval(pollIncomingCalls, 1500);
    return () => clearInterval(callInterval);
  }, [currentUser.id]);

  const loadAcceptedChatsAndRequests = async () => {
    if (!currentUser.id) return;

    const reqRes = await queryNeon(
      `SELECT r.id as request_id, r.sender_id, u.username, u.avatar, u.bio, u.last_seen 
       FROM requests r 
       JOIN users u ON r.sender_id = u.id 
       WHERE r.receiver_id = $1 AND r.status = 'pending'`,
      [currentUser.id]
    );

    if (reqRes && reqRes.rows) {
      setIncomingRequests(reqRes.rows);
    }

    const friendsRes = await queryNeon(
      `SELECT u.id, u.username, u.email, u.avatar, u.bio, u.last_seen 
       FROM requests r 
       JOIN users u ON (CASE WHEN r.sender_id = $1 THEN r.receiver_id ELSE r.sender_id END) = u.id 
       WHERE (r.sender_id = $1 OR r.receiver_id = $1) AND r.status = 'accepted'`,
      [currentUser.id]
    );

    if (friendsRes && friendsRes.rows) {
      const formattedChats = friendsRes.rows.map((peer) => ({
        id: peer.id,
        peerUserId: peer.id,
        username: peer.username,
        avatar: peer.avatar,
        bio: peer.bio,
        last_seen: peer.last_seen
      }));

      setChats(formattedChats);
    }
  };

  useEffect(() => {
    if (!currentUser.id) return;

    loadAcceptedChatsAndRequests();
    const interval = setInterval(loadAcceptedChatsAndRequests, 3000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  useEffect(() => {
    if (!currentUser.id || !activeChat) return;

    const syncChatDetails = async () => {
      await queryNeon(
        `UPDATE messages SET seen_at = NOW() 
         WHERE receiver_id = $1 AND sender_id = $2 AND seen_at IS NULL`,
        [currentUser.id, activeChat.id]
      );

      const msgRes = await queryNeon(
        `SELECT id, sender_id, receiver_id, text, image, audio, reaction, reply_to_id, reply_to_text, is_deleted_everyone, deleted_by_users, seen_at, created_at FROM messages 
         WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) 
         ORDER BY id ASC`,
        [currentUser.id, activeChat.id]
      );

      if (msgRes && msgRes.rows) {
        const filteredMsgs = msgRes.rows
          .filter((m) => {
            const deletedBy = (m.deleted_by_users || '').split(',');
            return !deletedBy.includes(currentUser.id);
          })
          .map((m) => ({
            id: m.id,
            senderId: m.sender_id,
            receiverId: m.receiver_id,
            text: m.text,
            image: m.image,
            audio: m.audio,
            reaction: m.reaction,
            replyToId: m.reply_to_id,
            replyToText: m.reply_to_text,
            isDeletedEveryone: m.is_deleted_everyone,
            createdAt: m.created_at,
            seenAt: m.seen_at
          }));
        setMessages(filteredMsgs);
      }

      const peerRes = await queryNeon(
        `SELECT last_seen, avatar, bio FROM users WHERE id = $1`,
        [activeChat.peerUserId || activeChat.id]
      );

      if (peerRes && peerRes.rows && peerRes.rows[0]) {
        const peerData = peerRes.rows[0];
        setActiveChat((prev) => prev ? {
          ...prev,
          last_seen: peerData.last_seen,
          avatar: peerData.avatar || prev.avatar,
          bio: peerData.bio || prev.bio
        } : null);
      }
    };

    syncChatDetails();
    const syncInterval = setInterval(syncChatDetails, 2000);

    return () => clearInterval(syncInterval);
  }, [currentUser.id, activeChat?.id]);

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const uploadToCloudinary = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: 'POST', body: formData }
      );

      if (!response.ok) throw new Error('Cloudinary upload failed');
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary Upload Error:', error);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    const cleanUsername = authForm.username.trim().toLowerCase();
    const cleanEmail = authForm.email.trim().toLowerCase();

    if (authMode === 'register') {
      if (!cleanUsername || !cleanEmail || !authForm.password) {
        showToast('Please fill in all fields!');
        return;
      }

      showToast('Creating account...');
      const dbCheck = await queryNeon(`SELECT * FROM users WHERE LOWER(username) = $1`, [cleanUsername]);
      if (!dbCheck) return;

      let existingUser = dbCheck && dbCheck.rows && dbCheck.rows[0];

      if (existingUser) {
        showToast('Username already taken! Choose another.');
        return;
      }

      const userId = 'usr_' + Date.now();
      const newUser = {
        id: userId,
        username: authForm.username.trim(),
        email: cleanEmail,
        password: authForm.password,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        bio: 'Hey there! I am using Chatrio by ED 🚀',
        last_seen: new Date().toISOString()
      };

      const insertRes = await queryNeon(
        `INSERT INTO users (id, username, email, password, avatar, bio, last_seen) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [newUser.id, newUser.username, newUser.email, newUser.password, newUser.avatar, newUser.bio]
      );

      if (!insertRes) return;

      setCurrentUser(newUser);
      setProfileForm({ username: newUser.username, email: newUser.email, bio: newUser.bio });
      localStorage.setItem('chatrio_user', JSON.stringify(newUser));
      setIsLoggedIn(true);
      showToast(`Welcome to Chatrio, @${newUser.username}! 🎉`);

    } else {
      showToast('Logging in...');
      const dbMatch = await queryNeon(`SELECT * FROM users WHERE LOWER(username) = $1 AND password = $2`, [cleanUsername, authForm.password]);
      if (!dbMatch) return;

      let userMatch = dbMatch && dbMatch.rows && dbMatch.rows[0];

      if (userMatch) {
        setCurrentUser(userMatch);
        setProfileForm({ username: userMatch.username, email: userMatch.email, bio: userMatch.bio || 'Hey there!' });
        localStorage.setItem('chatrio_user', JSON.stringify(userMatch));
        setIsLoggedIn(true);
        showToast(`Welcome back, @${userMatch.username}!`);
      } else {
        showToast('Invalid Username or Password');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('chatrio_user');
    setIsLoggedIn(false);
    setActiveChat(null);
    setMobileChatOpen(false);
    showToast('Logged out successfully');
  };

  const handleSearchUsers = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchedUsers([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const cleanQ = query.trim().toLowerCase();

    const dbRes = await queryNeon(
      `SELECT u.id, u.username, u.email, u.avatar, u.bio, u.last_seen,
              r.status as request_status, r.sender_id as request_sender
       FROM users u
       LEFT JOIN requests r ON ((r.sender_id = $1 AND r.receiver_id = u.id) OR (r.sender_id = u.id AND r.receiver_id = $1))
       WHERE LOWER(u.username) LIKE $2 AND u.id != $1`,
      [currentUser.id, `%${cleanQ}%`]
    );

    let matches = dbRes && dbRes.rows ? dbRes.rows : [];
    setSearchedUsers(matches);
  };

  const handleSendRequest = async (targetUser) => {
    showToast(`Sending request to @${targetUser.username}...`);

    const res = await queryNeon(
      `INSERT INTO requests (sender_id, receiver_id, status) VALUES ($1, $2, 'pending')
       ON CONFLICT (sender_id, receiver_id) DO UPDATE SET status = 'pending'`,
      [currentUser.id, targetUser.id]
    );

    if (res) {
      showToast(`Request sent to @${targetUser.username}!`);
      handleSearchUsers(searchQuery);
    }
  };

  const handleAcceptRequest = async (senderId, senderUsername) => {
    showToast(`Accepting request from @${senderUsername}...`);

    const res = await queryNeon(
      `UPDATE requests SET status = 'accepted' 
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)`,
      [senderId, currentUser.id]
    );

    if (res) {
      showToast(`You are now connected with @${senderUsername}! 🎉`);
      loadAcceptedChatsAndRequests();
      if (searchQuery) handleSearchUsers(searchQuery);
    }
  };

  const handleDeclineRequest = async (senderId) => {
    await queryNeon(
      `DELETE FROM requests 
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)`,
      [senderId, currentUser.id]
    );

    showToast('Request declined');
    loadAcceptedChatsAndRequests();
    if (searchQuery) handleSearchUsers(searchQuery);
  };

  const openAcceptedChat = (targetUser) => {
    let existingChat = {
      id: targetUser.id,
      peerUserId: targetUser.id,
      username: targetUser.username,
      avatar: targetUser.avatar,
      bio: targetUser.bio,
      last_seen: targetUser.last_seen
    };

    setActiveChat(existingChat);
    setMobileChatOpen(true);
    setSearchQuery('');
    setSearchedUsers([]);
    setIsSearching(false);
    setActiveTab('chats');
  };

  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecordingAudio(true);
      setRecordingDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      showToast('Microphone access denied or unsupported');
    }
  };

  const stopAndSendAudioMessage = () => {
    if (!mediaRecorderRef.current || !activeChat) return;

    mediaRecorderRef.current.onstop = async () => {
      clearInterval(timerIntervalRef.current);
      setIsRecordingAudio(false);

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });

      showToast('Sending voice note...');
      const audioUrl = await uploadToCloudinary(audioFile);

      const res = await queryNeon(
        `INSERT INTO messages (sender_id, receiver_id, text, audio) VALUES ($1, $2, $3, $4) RETURNING *`,
        [currentUser.id, activeChat.id, '🎤 Voice Note', audioUrl]
      );

      if (res && res.rows && res.rows[0]) {
        const row = res.rows[0];
        showToast('Voice note sent!');
        setMessages((prev) => [
          ...prev,
          {
            id: row.id,
            senderId: currentUser.id,
            receiverId: activeChat.id,
            text: '🎤 Voice Note',
            audio: audioUrl,
            createdAt: row.created_at,
            seenAt: null
          }
        ]);
      }
    };

    mediaRecorderRef.current.stop();
  };

  const cancelAudioRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerIntervalRef.current);
    setIsRecordingAudio(false);
    showToast('Voice note cancelled');
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChat) return;

    const textMsg = messageInput.trim();
    const replyId = replyingTo ? replyingTo.id : null;
    const replyText = replyingTo ? replyingTo.text : '';

    setMessageInput('');
    setReplyingTo(null);

    const res = await queryNeon(
      `INSERT INTO messages (sender_id, receiver_id, text, reply_to_id, reply_to_text) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [currentUser.id, activeChat.id, textMsg, replyId, replyText]
    );

    if (res && res.rows && res.rows[0]) {
      const row = res.rows[0];
      const newMsg = {
        id: row.id,
        senderId: currentUser.id,
        receiverId: activeChat.id,
        text: textMsg,
        replyToId: replyId,
        replyToText: replyText,
        createdAt: row.created_at,
        seenAt: null
      };
      setMessages((prev) => [...prev, newMsg]);
    }
  };

  const handleImageAttachment = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;

    showToast('Uploading photo...');
    const imageUrl = await uploadToCloudinary(file);

    const res = await queryNeon(
      `INSERT INTO messages (sender_id, receiver_id, text, image) VALUES ($1, $2, $3, $4) RETURNING *`,
      [currentUser.id, activeChat.id, '📷 Photo Attachment', imageUrl]
    );

    if (res && res.rows && res.rows[0]) {
      const row = res.rows[0];
      showToast('Photo sent!');
      setMessages((prev) => [
        ...prev,
        {
          id: row.id,
          senderId: currentUser.id,
          receiverId: activeChat.id,
          text: '📷 Photo Attachment',
          image: imageUrl,
          createdAt: row.created_at,
          seenAt: null
        }
      ]);
    }
  };

  const handleAddReaction = async (msgId, emoji) => {
    setContextMenuMsg(null);
    await queryNeon(`UPDATE messages SET reaction = $1 WHERE id = $2`, [emoji, msgId]);
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, reaction: emoji } : m));
  };

  const handleUnsendEveryone = async (msgId) => {
    setContextMenuMsg(null);
    showToast('Unsending message...');
    await queryNeon(`UPDATE messages SET is_deleted_everyone = TRUE WHERE id = $1`, [msgId]);
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isDeletedEveryone: true } : m));
  };

  const handleDeleteForMe = async (msgId) => {
    setContextMenuMsg(null);
    showToast('Message deleted for you');

    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;

    const res = await queryNeon(`SELECT deleted_by_users FROM messages WHERE id = $1`, [msgId]);
    let existingDeleted = (res && res.rows && res.rows[0] && res.rows[0].deleted_by_users) || '';
    let updatedList = existingDeleted ? `${existingDeleted},${currentUser.id}` : currentUser.id;

    await queryNeon(`UPDATE messages SET deleted_by_users = $1 WHERE id = $2`, [updatedList, msgId]);
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
  };

  const handleForwardMessage = async (targetChat) => {
    if (!forwardModalMsg) return;

    showToast(`Forwarding to @${targetChat.username}...`);

    await queryNeon(
      `INSERT INTO messages (sender_id, receiver_id, text, image, audio) VALUES ($1, $2, $3, $4, $5)`,
      [currentUser.id, targetChat.id, `↪️ ${forwardModalMsg.text}`, forwardModalMsg.image || null, forwardModalMsg.audio || null]
    );

    setForwardModalMsg(null);
    showToast(`Message forwarded to @${targetChat.username}!`);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showToast('Updating profile picture...');
    const avatarUrl = await uploadToCloudinary(file);

    const updated = { ...currentUser, avatar: avatarUrl };
    setCurrentUser(updated);
    localStorage.setItem('chatrio_user', JSON.stringify(updated));

    queryNeon(`UPDATE users SET avatar = $1 WHERE id = $2`, [avatarUrl, currentUser.id]);
    showToast('Profile photo updated!');
  };

  const handleSaveProfile = () => {
    const updated = {
      ...currentUser,
      username: profileForm.username,
      email: profileForm.email,
      bio: profileForm.bio
    };

    setCurrentUser(updated);
    localStorage.setItem('chatrio_user', JSON.stringify(updated));

    queryNeon(
      `UPDATE users SET username = $1, email = $2, bio = $3 WHERE id = $4`,
      [profileForm.username, profileForm.email, profileForm.bio, currentUser.id]
    );

    showToast('Profile updated successfully!');
  };

  const handlePublishStatus = () => {
    if (!statusTextInput.trim()) return;

    const newStatus = {
      id: 'st_' + Date.now(),
      userId: currentUser.id,
      username: currentUser.username,
      avatar: currentUser.avatar,
      text: statusTextInput.trim(),
      time: 'Just now'
    };

    setStatuses((prev) => [newStatus, ...prev]);
    setStatusTextInput('');
    setShowCreateStatusModal(false);
    showToast('Status published!');
  };

  const startCall = async (callType) => {
    if (!activeChat) return;

    showToast(`Ringing @${activeChat.username}...`);

    const res = await queryNeon(
      `INSERT INTO calls (caller_id, receiver_id, call_type, status) VALUES ($1, $2, $3, 'ringing') RETURNING *`,
      [currentUser.id, activeChat.id, callType]
    );

    setCurrentCall({
      id: res && res.rows && res.rows[0] ? res.rows[0].id : Date.now(),
      type: callType,
      peerName: activeChat.username,
      peerAvatar: activeChat.avatar
    });

    const newCallLog = {
      id: 'call_' + Date.now(),
      name: activeChat.username,
      avatar: activeChat.avatar,
      type: callType,
      time: 'Just now'
    };
    setCallLogs((prev) => [newCallLog, ...prev]);
  };

  const handleAcceptIncomingCall = async () => {
    if (!incomingCallAlert) return;

    await queryNeon(`UPDATE calls SET status = 'accepted' WHERE id = $1`, [incomingCallAlert.call_id]);

    setCurrentCall({
      id: incomingCallAlert.call_id,
      type: incomingCallAlert.call_type,
      peerName: incomingCallAlert.caller_name,
      peerAvatar: incomingCallAlert.caller_avatar
    });

    setIncomingCallAlert(null);
  };

  const handleDeclineIncomingCall = async () => {
    if (!incomingCallAlert) return;

    await queryNeon(`UPDATE calls SET status = 'declined' WHERE id = $1`, [incomingCallAlert.call_id]);
    setIncomingCallAlert(null);
    showToast('Call declined');
  };

  const endCall = async () => {
    if (currentCall && currentCall.id) {
      await queryNeon(`UPDATE calls SET status = 'ended' WHERE id = $1`, [currentCall.id]);
    }
    setCurrentCall(null);
    showToast('Call ended');
  };

  const isPeerActiveNow = activeChat && activeChat.last_seen && ((new Date() - new Date(activeChat.last_seen)) / 1000) < 20;

  if (!isLoggedIn) {
    return (
      <div className="h-[100dvh] w-screen fixed inset-0 flex items-center justify-center bg-[#070b14] text-white p-4 font-sans overflow-hidden">
        {toastMessage && (
          <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-red-500/40 flex items-center gap-2 text-xs animate-bounce">
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative z-10">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Chatrio <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/30">by ED</span>
            </h2>
            <p className="text-xs text-slate-400 mt-2">
              {authMode === 'register' ? 'Create your Chatrio account' : 'Login to your Chatrio account'}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Username (@)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. zaidkhan"
                value={authForm.username}
                onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl py-3 px-4 text-base sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="zaid@chatrio.com"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl py-3 px-4 text-base sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl py-3 px-4 text-base sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {authMode === 'register' ? 'Register Account' : 'Log In'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            {authMode === 'register' ? (
              <p>
                Already registered?{' '}
                <button type="button" onClick={() => setAuthMode('login')} className="text-emerald-400 font-semibold hover:underline ml-1">
                  Log In
                </button>
              </p>
            ) : (
              <p>
                Need an account?{' '}
                <button type="button" onClick={() => setAuthMode('register')} className="text-emerald-400 font-semibold hover:underline ml-1">
                  Create One
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-[100dvh] w-screen fixed inset-0 overflow-hidden flex flex-col font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#070b14] text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
      
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-2.5 text-xs animate-bounce max-w-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* HEADER */}
      <header className={`h-16 border-b px-4 flex items-center justify-between backdrop-blur-md z-20 flex-shrink-0 ${theme === 'dark' ? 'border-slate-800/80 bg-[#0a0f1d]/90' : 'border-slate-200 bg-white/90'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-bold shadow-md">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg leading-tight">
              Chatrio <span className="text-xs text-emerald-400 font-medium">by ED</span>
            </h1>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> @{currentUser.username}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowRequestsModal(true)}
            className="relative w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-300 hover:bg-slate-700/60 transition-all"
            title="Friend Requests"
          >
            <Bell className="w-5 h-5 text-emerald-400" />
            {incomingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-300 hover:bg-slate-700/60 transition-all"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>

          <div
            onClick={() => { setActiveTab('profile'); setMobileChatOpen(false); }}
            className="flex items-center space-x-2 cursor-pointer bg-slate-800/40 p-1 pr-3 rounded-full border border-slate-700/50 hover:bg-slate-700/40 transition-all"
          >
            <img src={currentUser.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
            <span className="text-xs font-semibold max-w-[90px] truncate hidden sm:inline-block">
              @{currentUser.username}
            </span>
          </div>

          <button onClick={handleLogout} className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20 hover:bg-red-500/20 transition-all">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* SIDEBAR */}
        <aside className={`w-full sm:w-80 md:w-96 border-r flex flex-col z-10 ${mobileChatOpen ? 'hidden sm:flex' : 'flex'} ${theme === 'dark' ? 'bg-[#0b101e]/80 border-slate-800/80' : 'bg-white border-slate-200'}`}>
          
          <div className={`flex items-center border-b p-2 gap-1 flex-shrink-0 ${theme === 'dark' ? 'border-slate-800/80 bg-[#070b15]' : 'border-slate-200 bg-slate-50'}`}>
            <button onClick={() => setActiveTab('chats')} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'chats' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'}`}>
              <MessageSquare className="w-4 h-4" /> Chats
            </button>
            <button onClick={() => setActiveTab('status')} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'status' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'}`}>
              <Circle className="w-4 h-4" /> Status
            </button>
            <button onClick={() => setActiveTab('calls')} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'calls' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'}`}>
              <Phone className="w-4 h-4" /> Calls
            </button>
            <button onClick={() => setActiveTab('profile')} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'profile' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'}`}>
              <User className="w-4 h-4" /> Profile
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="p-3 border-b border-slate-800/60 relative flex-shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                placeholder="Search @username to send request..."
                className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-base sm:text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {isSearching && (
              <div className="absolute top-full left-0 right-0 bg-slate-900 border border-slate-800 rounded-b-2xl shadow-2xl z-30 p-2 max-h-72 overflow-y-auto">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider px-2 py-1 font-semibold">
                  Search Results
                </p>
                {searchedUsers.length === 0 ? (
                  <p className="text-xs text-slate-500 p-3 text-center">No registered user found with @{searchQuery}</p>
                ) : (
                  searchedUsers.map((u) => {
                    const isUserOnline = u.last_seen && ((new Date() - new Date(u.last_seen)) / 1000) < 20;
                    const status = u.request_status;
                    const isSender = u.request_sender === currentUser.id;

                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2.5 hover:bg-slate-800/80 rounded-xl transition-colors"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                          <div className="relative flex-shrink-0">
                            <img src={u.avatar} className="w-9 h-9 rounded-full object-cover" alt="" />
                            <span className={`w-2.5 h-2.5 rounded-full absolute bottom-0 right-0 border-2 border-slate-900 ${isUserOnline ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-xs text-white truncate">@{u.username}</h4>
                            <p className="text-[10px] text-emerald-400">{formatLastSeen(u.last_seen)}</p>
                          </div>
                        </div>

                        <div>
                          {status === 'accepted' ? (
                            <button
                              onClick={() => openAcceptedChat(u)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-md"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Chat
                            </button>
                          ) : status === 'pending' && isSender ? (
                            <button
                              disabled
                              className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs font-medium flex items-center gap-1 cursor-not-allowed border border-slate-700"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-400" /> Pending
                            </button>
                          ) : status === 'pending' && !isSender ? (
                            <button
                              onClick={() => handleAcceptRequest(u.id, u.username)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-md"
                            >
                              <Check className="w-3.5 h-3.5" /> Accept
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSendRequest(u)}
                              className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/40 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
                            >
                              <UserPlus className="w-3.5 h-3.5" /> Request
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* TABS LIST */}
          <div className="flex-1 overflow-y-auto relative min-h-0">
            {activeTab === 'chats' && (
              <div className="p-2 space-y-1">
                {chats.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    <UserPlus className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
                    <p className="font-semibold text-slate-400">No active conversations</p>
                    <p className="mt-1 text-[11px] max-w-xs mx-auto">
                      Search @username in the search bar above to send a request. Once accepted, chats stay here permanently!
                    </p>
                  </div>
                ) : (
                  chats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => {
                        setActiveChat(chat);
                        setMobileChatOpen(true);
                      }}
                      className={`flex items-center space-x-3 p-3 rounded-2xl cursor-pointer transition-colors ${
                        activeChat?.id === chat.id ? 'bg-slate-800 border border-slate-700/60' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="relative">
                        <img src={chat.avatar} className="w-12 h-12 rounded-full object-cover" alt="" />
                        <span className={`w-3 h-3 rounded-full absolute bottom-0 right-0 border-2 border-slate-900 ${chat.last_seen && ((new Date() - new Date(chat.last_seen)) / 1000) < 20 ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm">@{chat.username}</h4>
                        <p className="text-xs text-slate-400 truncate">{chat.bio}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'status' && (
              <div className="p-3 space-y-4">
                <div onClick={() => setShowCreateStatusModal(true)} className="flex items-center space-x-3 p-3 bg-slate-800/40 rounded-2xl cursor-pointer hover:bg-slate-800/70 transition-colors">
                  <img src={currentUser.avatar} className="w-12 h-12 rounded-full object-cover" alt="" />
                  <div>
                    <h4 className="font-semibold text-sm">My Status</h4>
                    <p className="text-xs text-slate-400">Post update</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {statuses.map((st) => (
                    <div key={st.id} onClick={() => setActiveStatusViewer(st)} className="flex items-center space-x-3 p-3 bg-slate-800/30 rounded-2xl cursor-pointer hover:bg-slate-800/60 transition-colors">
                      <img src={st.avatar} className="w-11 h-11 rounded-full object-cover" alt="" />
                      <div>
                        <h4 className="font-semibold text-sm">@{st.username}</h4>
                        <p className="text-xs text-slate-400">{st.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'calls' && (
              <div className="p-2 space-y-1">
                {callLogs.map((call) => (
                  <div key={call.id} className="flex items-center space-x-3 p-3 rounded-2xl">
                    <img src={call.avatar} className="w-11 h-11 rounded-full object-cover" alt="" />
                    <div>
                      <h4 className="font-semibold text-sm">@{call.name}</h4>
                      <p className="text-xs text-slate-400">{call.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="p-4 space-y-4">
                <div className="flex flex-col items-center text-center">
                  <label className="relative group cursor-pointer">
                    <img src={currentUser.avatar} className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500/80 shadow-xl" alt="" />
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                  <h3 className="mt-2 font-bold text-lg">@{currentUser.username}</h3>
                  <p className="text-xs text-emerald-400">{currentUser.email}</p>
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40">
                    <label className="text-xs text-slate-400 block mb-1">Username (@)</label>
                    <input
                      type="text"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      className="bg-transparent text-sm font-semibold focus:outline-none w-full text-white"
                    />
                  </div>

                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40">
                    <label className="text-xs text-slate-400 block mb-1">About / Bio</label>
                    <input
                      type="text"
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                      className="bg-transparent text-sm font-semibold focus:outline-none w-full text-white"
                    />
                  </div>

                  <button onClick={handleSaveProfile} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold text-xs shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-colors">
                    Save Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* CHAT DISPLAY */}
        <main className={`flex-1 flex flex-col relative h-full min-h-0 ${!mobileChatOpen ? 'hidden sm:flex' : 'flex'} ${theme === 'dark' ? 'bg-[#070b15]/90' : 'bg-slate-100'}`}>
          {!activeChat ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <MessageSquare className="w-12 h-12 text-emerald-400 mb-3" />
              <h2 className="text-xl font-bold">Chatrio by ED</h2>
              <p className="text-xs text-slate-400 max-w-sm mt-1">Search an exact @username to send a chat request and start cross-device messaging!</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
              <div className={`h-16 border-b px-4 flex items-center justify-between flex-shrink-0 ${theme === 'dark' ? 'border-slate-800/80 bg-[#0a0f1e]/90' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center space-x-3">
                  <button onClick={() => setMobileChatOpen(false)} className="sm:hidden p-2 text-slate-400 hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="relative">
                    <img src={activeChat.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                    <span className={`w-3 h-3 rounded-full absolute bottom-0 right-0 border-2 border-slate-900 ${isPeerActiveNow ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">@{activeChat.username}</h3>
                    <p className={`text-[11px] font-medium ${isPeerActiveNow ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {formatLastSeen(activeChat.last_seen)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button onClick={() => startCall('audio')} className="p-2.5 bg-slate-800 text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><Phone className="w-4 h-4" /></button>
                  <button onClick={() => startCall('video')} className="p-2.5 bg-slate-800 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Video className="w-4 h-4" /></button>
                </div>
              </div>

              {/* MESSAGES AREA */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0" onClick={() => setContextMenuMsg(null)}>
                {messages.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 my-auto">No messages yet. Say hi to @{activeChat.username}! 👋</p>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    const isSeen = Boolean(msg.seenAt);
                    const sentTimeText = formatTimeAgo(msg.createdAt);
                    const seenTimeText = msg.seenAt ? formatTimeAgo(msg.seenAt) : '';

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative`}
                      >
                        <div
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenuMsg(msg);
                          }}
                          className={`max-w-[80%] p-3 rounded-2xl shadow-md relative group/msg ${
                            isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/50'
                          }`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setContextMenuMsg(msg);
                            }}
                            className="absolute top-1 right-1 opacity-0 group-hover/msg:opacity-100 p-1 bg-black/30 rounded-full text-white transition-opacity"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </button>

                          {msg.replyToText && (
                            <div className="bg-black/20 border-l-2 border-emerald-300 p-1.5 rounded text-[10px] mb-1.5 text-slate-200">
                              <p className="font-semibold text-emerald-200 flex items-center gap-1">
                                <CornerDownRight className="w-2.5 h-2.5" /> Replying to
                              </p>
                              <p className="truncate opacity-90">{msg.replyToText}</p>
                            </div>
                          )}

                          {msg.isDeletedEveryone ? (
                            <p className="text-xs italic opacity-70 flex items-center gap-1">
                              <Trash2 className="w-3 h-3" /> This message was deleted
                            </p>
                          ) : (
                            <>
                              {msg.image && <img src={msg.image} className="max-w-xs rounded-xl mb-2 object-cover" alt="" />}
                              {msg.audio && (
                                <div className="mb-2 flex items-center gap-2 bg-black/20 p-2 rounded-xl">
                                  <Volume2 className="w-4 h-4 text-emerald-300 flex-shrink-0 animate-pulse" />
                                  <audio controls src={msg.audio} className="h-8 w-48 sm:w-56" />
                                </div>
                              )}
                              <p className="text-xs leading-relaxed">{msg.text}</p>
                            </>
                          )}

                          {msg.reaction && (
                            <div className="absolute -bottom-2 left-2 bg-slate-900 border border-slate-700 rounded-full px-1.5 py-0.5 text-xs shadow-lg">
                              {msg.reaction}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-80">
                            {isMe && !msg.isDeletedEveryone && (
                              <span>
                                {isSeen ? (
                                  <span className="flex items-center gap-1 text-cyan-200 font-medium">
                                    <CheckCheck className="w-3 h-3 text-cyan-300" /> Seen {seenTimeText}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-emerald-200">
                                    <Check className="w-3 h-3 text-emerald-200" /> Sent {sentTimeText}
                                  </span>
                                )}
                              </span>
                            )}
                            {!isMe && !msg.isDeletedEveryone && (
                              <span className="text-slate-400">{sentTimeText}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* REPLY PREVIEW BOX */}
              {replyingTo && (
                <div className="bg-slate-800/90 border-t border-slate-700 p-2.5 flex items-center justify-between text-xs text-white flex-shrink-0">
                  <div className="flex items-center space-x-2 min-w-0 pr-2">
                    <Reply className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-emerald-400 text-[11px]">Replying to message</p>
                      <p className="text-slate-300 truncate text-[10px]">{replyingTo.text}</p>
                    </div>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="p-1 text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* VOICE RECORDING BAR / FIXED INPUT BAR */}
              {isRecordingAudio ? (
                <div className="p-3 border-t border-slate-800/80 bg-red-950/40 flex items-center justify-between space-x-3 flex-shrink-0 animate-pulse">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
                    <span className="text-xs font-semibold text-red-400">Recording voice note... ({recordingDuration}s)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={cancelAudioRecording} className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-medium">
                      Cancel
                    </button>
                    <button onClick={stopAndSendAudioMessage} className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-lg shadow-red-600/30">
                      <Square className="w-3.5 h-3.5 fill-current" /> Send Note
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 border-t border-slate-800/80 bg-slate-900/90 flex items-center space-x-2 flex-shrink-0">
                  <label className="p-2 text-slate-400 hover:text-emerald-400 cursor-pointer transition-colors">
                    <Paperclip className="w-5 h-5" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageAttachment} />
                  </label>

                  <button onClick={startRecordingAudio} className="p-2 text-slate-400 hover:text-red-400 transition-colors" title="Hold to record voice note">
                    <Mic className="w-5 h-5" />
                  </button>

                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl py-2.5 px-4 text-base sm:text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button onClick={handleSendMessage} className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* REAL-TIME INCOMING CALL RINGING DIALOG */}
      {incomingCallAlert && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl w-full max-w-xs p-6 text-center space-y-6 shadow-2xl animate-bounce">
            <div className="relative w-24 h-24 mx-auto">
              <img src={incomingCallAlert.caller_avatar} className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500 shadow-xl" alt="" />
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-2 rounded-full animate-ping">
                <PhoneIncoming className="w-4 h-4" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">@{incomingCallAlert.caller_name}</h3>
              <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider mt-1">
                Incoming Chatrio {incomingCallAlert.call_type} Call...
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleAcceptIncomingCall}
                className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-600/40 hover:scale-110 transition-transform"
                title="Accept Call"
              >
                <PhoneCall className="w-5 h-5" />
              </button>
              <button
                onClick={handleDeclineIncomingCall}
                className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-600/40 hover:scale-110 transition-transform"
                title="Decline Call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE CALL MODAL */}
      {currentCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-6 shadow-2xl">
            <img src={currentCall.peerAvatar} className="w-24 h-24 rounded-full mx-auto border-4 border-slate-800 shadow-xl object-cover" alt="" />
            <div>
              <h3 className="text-xl font-bold">@{currentCall.peerName}</h3>
              <p className="text-xs text-emerald-400 uppercase tracking-wider font-semibold mt-1">Chatrio {currentCall.type} Call Connected</p>
            </div>
            <button onClick={endCall} className="w-14 h-14 bg-red-600 text-white rounded-full mx-auto flex items-center justify-center shadow-lg shadow-red-600/40 hover:bg-red-700 transition-colors">
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* MESSAGE CONTEXT MENU POPUP */}
      {contextMenuMsg && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xs p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-300">Message Actions</span>
              <button onClick={() => setContextMenuMsg(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-800/80 p-2 rounded-2xl">
              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleAddReaction(contextMenuMsg.id, emoji)}
                  className="text-lg hover:scale-125 transition-transform p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="space-y-1 text-xs">
              <button
                onClick={() => {
                  setReplyingTo(contextMenuMsg);
                  setContextMenuMsg(null);
                }}
                className="w-full p-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-left text-emerald-400 font-semibold flex items-center gap-2"
              >
                <Reply className="w-4 h-4" /> Reply
              </button>

              <button
                onClick={() => {
                  setForwardModalMsg(contextMenuMsg);
                  setContextMenuMsg(null);
                }}
                className="w-full p-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-left text-blue-400 font-semibold flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Forward Message
              </button>

              <button
                onClick={() => handleDeleteForMe(contextMenuMsg.id)}
                className="w-full p-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-left text-amber-400 font-semibold flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete for me
              </button>

              {contextMenuMsg.senderId === currentUser.id && !contextMenuMsg.isDeletedEveryone && (
                <button
                  onClick={() => handleUnsendEveryone(contextMenuMsg.id)}
                  className="w-full p-2.5 bg-red-600/20 hover:bg-red-600 hover:text-white border border-red-500/30 rounded-xl text-left text-red-400 font-semibold flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Unsend (Delete for Everyone)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FORWARD MESSAGE MODAL */}
      {forwardModalMsg && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Forward Message To...</h3>
              <button onClick={() => setForwardModalMsg(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {chats.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleForwardMessage(c)}
                  className="flex items-center justify-between p-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <img src={c.avatar} className="w-9 h-9 rounded-full object-cover" alt="" />
                    <span className="font-semibold text-xs text-white">@{c.username}</span>
                  </div>
                  <Share2 className="w-4 h-4 text-emerald-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FRIEND REQUESTS MODAL */}
      {showRequestsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2 text-white">
                <Bell className="w-4 h-4 text-emerald-400" /> Incoming Chat Requests
              </h3>
              <button onClick={() => setShowRequestsModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {incomingRequests.length === 0 ? (
                <p className="text-xs text-slate-500 p-4 text-center">No pending chat requests</p>
              ) : (
                incomingRequests.map((req) => (
                  <div key={req.request_id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <img src={req.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-white truncate">@{req.username}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{req.bio}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleAcceptRequest(req.sender_id, req.username)}
                        className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md"
                        title="Accept Request"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(req.sender_id)}
                        className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg border border-red-500/30"
                        title="Decline Request"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* STATUS MODAL */}
      {showCreateStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">Post Status Update</h3>
              <button onClick={() => setShowCreateStatusModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={statusTextInput}
              onChange={(e) => setStatusTextInput(e.target.value)}
              placeholder="What is on your mind?"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              rows={3}
            />
            <button onClick={handlePublishStatus} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-500 transition-colors">
              Publish Status
            </button>
          </div>
        </div>
      )}

      {/* STATUS VIEWER MODAL */}
      {activeStatusViewer && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-6">
          <div className="w-full max-w-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src={activeStatusViewer.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
              <div>
                <h4 className="font-bold text-sm text-white">@{activeStatusViewer.username}</h4>
                <p className="text-[11px] text-slate-400">{activeStatusViewer.time}</p>
              </div>
            </div>
            <button onClick={() => setActiveStatusViewer(null)} className="text-white p-2">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="my-auto text-center px-4">
            <p className="text-2xl font-bold text-white leading-relaxed">{activeStatusViewer.text}</p>
          </div>
        </div>
      )}

    </div>
  );
}