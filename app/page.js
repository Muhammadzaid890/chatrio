'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Phone,
  Video,
  User,
  Circle,
  Search,
  Plus,
  Send,
  Paperclip,
  Mic,
  PhoneOff,
  Sun,
  Moon,
  LogOut,
  Camera,
  X,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'hp0bmfy7';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState('dark');

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('register'); // 'login' | 'register'
  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    password: ''
  });

  // Current Logged-in User Profile
  const [currentUser, setCurrentUser] = useState({
    id: null,
    username: '',
    email: '',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'Hey there! I am using Chatrio by Zaid 🚀'
  });

  // App Navigation Tabs & Active Chat State
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'status' | 'calls' | 'profile'
  const [activeChat, setActiveChat] = useState(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // Username Search Query
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Modals & Calls
  const [showCreateStatusModal, setShowCreateStatusModal] = useState(false);
  const [activeStatusViewer, setActiveStatusViewer] = useState(null);

  const [currentCall, setCurrentCall] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Inputs & Toast Notifications
  const [messageInput, setMessageInput] = useState('');
  const [statusTextInput, setStatusTextInput] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Profile Edit State
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    bio: ''
  });

  // Real-time State
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [callLogs, setCallLogs] = useState([]);

  // Database helper: executes SQL against Neon DB API endpoint
  const queryNeon = async (sql, params = []) => {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params })
      });
      if (!res.ok) {
        return null;
      }
      return await res.json();
    } catch (err) {
      console.warn('Neon DB endpoint query error:', err);
      return null;
    }
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Load saved session
    try {
      const savedUser = localStorage.getItem('chatrio_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setCurrentUser(parsedUser);
        setProfileForm({
          username: parsedUser.username || '',
          email: parsedUser.email || '',
          bio: parsedUser.bio || 'Hey there! I am using Chatrio by Zaid 🚀'
        });
        setIsLoggedIn(true);
      }
    } catch (err) {
      console.error('Session load error:', err);
    }
  }, [theme]);

  // Periodic polling for message & chat updates
  useEffect(() => {
    if (!currentUser.id) return;

    const interval = setInterval(() => {
      syncChatsAndMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [currentUser, activeChat]);

  const syncChatsAndMessages = async () => {
    if (!activeChat) return;
    const savedMsgs = JSON.parse(localStorage.getItem(`msgs_${currentUser.id}_${activeChat.id}`) || '[]');
    setMessages(savedMsgs);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3200);
  };

  const uploadToCloudinary = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
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

      // 1. Check Neon DB first
      const dbCheck = await queryNeon(`SELECT * FROM users WHERE LOWER(username) = $1`, [cleanUsername]);
      let existingUser = dbCheck && dbCheck.rows && dbCheck.rows[0];

      // 2. Local memory fallback check
      const localUsers = JSON.parse(localStorage.getItem('chatrio_db_users') || '[]');
      if (!existingUser) {
        existingUser = localUsers.find((u) => u.username.toLowerCase() === cleanUsername);
      }

      if (existingUser) {
        showToast('Username already taken! Choose another.');
        return;
      }

      const newUser = {
        id: 'usr_' + Date.now(),
        username: authForm.username.trim(),
        email: cleanEmail,
        password: authForm.password,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        bio: 'Hey there! I am using Chatrio by Zaid 🚀'
      };

      // Save to Neon DB
      await queryNeon(
        `INSERT INTO users (username, email, password, avatar, bio) VALUES ($1, $2, $3, $4, $5)`,
        [newUser.username, newUser.email, newUser.password, newUser.avatar, newUser.bio]
      );

      // Save to shared localStorage so cross-browser tabs / windows on same machine can resolve instantly
      localUsers.push(newUser);
      localStorage.setItem('chatrio_db_users', JSON.stringify(localUsers));

      setCurrentUser(newUser);
      setProfileForm({ username: newUser.username, email: newUser.email, bio: newUser.bio });
      localStorage.setItem('chatrio_user', JSON.stringify(newUser));
      setIsLoggedIn(true);
      showToast(`Welcome to Chatrio, @${newUser.username}! 🎉`);

    } else {
      // LOGIN
      const dbMatch = await queryNeon(`SELECT * FROM users WHERE LOWER(username) = $1 AND password = $2`, [cleanUsername, authForm.password]);
      let userMatch = dbMatch && dbMatch.rows && dbMatch.rows[0];

      if (!userMatch) {
        const localUsers = JSON.parse(localStorage.getItem('chatrio_db_users') || '[]');
        userMatch = localUsers.find(
          (u) => u.username.toLowerCase() === cleanUsername && u.password === authForm.password
        );
      }

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

    // Query Neon DB
    const dbRes = await queryNeon(
      `SELECT id, username, email, avatar, bio FROM users WHERE LOWER(username) LIKE $1 AND id != $2`,
      [`%${cleanQ}%`, currentUser.id]
    );

    let matches = dbRes && dbRes.rows ? dbRes.rows : [];

    // Fallback search in shared directory
    const localUsers = JSON.parse(localStorage.getItem('chatrio_db_users') || '[]');
    const localMatches = localUsers.filter(
      (u) => u.username.toLowerCase().includes(cleanQ) && u.id !== currentUser.id
    );

    // Merge unique users
    const combined = [...matches, ...localMatches];
    const unique = combined.filter((v, i, a) => a.findIndex(t => t.username.toLowerCase() === v.username.toLowerCase()) === i);

    setSearchedUsers(unique);
  };

  const startChatWithUser = (targetUser) => {
    let existingChat = chats.find((c) => c.peerUserId === targetUser.id || c.username === targetUser.username);

    if (!existingChat) {
      existingChat = {
        id: targetUser.id || 'chat_' + Date.now(),
        peerUserId: targetUser.id,
        username: targetUser.username,
        avatar: targetUser.avatar,
        bio: targetUser.bio,
        online: true
      };
      setChats((prev) => [existingChat, ...prev]);
    }

    setActiveChat(existingChat);
    setMobileChatOpen(true);
    setSearchQuery('');
    setSearchedUsers([]);
    setIsSearching(false);
    setActiveTab('chats');

    // Load messages for this conversation
    const savedMsgs = JSON.parse(localStorage.getItem(`msgs_${currentUser.id}_${existingChat.id}`) || '[]');
    setMessages(savedMsgs);
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeChat) return;

    const newMsg = {
      id: 'msg_' + Date.now(),
      senderId: currentUser.id,
      receiverId: activeChat.id,
      text: messageInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updated = [...messages, newMsg];
    setMessages(updated);

    // Persist messages for both participants
    localStorage.setItem(`msgs_${currentUser.id}_${activeChat.id}`, JSON.stringify(updated));
    localStorage.setItem(`msgs_${activeChat.id}_${currentUser.id}`, JSON.stringify(updated));

    // Save to Neon DB messages table
    queryNeon(
      `INSERT INTO messages (sender_id, receiver_id, text) VALUES ($1, $2, $3)`,
      [currentUser.id, activeChat.id, messageInput.trim()]
    );

    setMessageInput('');
  };

  const handleImageAttachment = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;

    showToast('Uploading photo...');
    const imageUrl = await uploadToCloudinary(file);

    const newMsg = {
      id: 'msg_' + Date.now(),
      senderId: currentUser.id,
      receiverId: activeChat.id,
      text: '📷 Photo Attachment',
      image: imageUrl,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    localStorage.setItem(`msgs_${currentUser.id}_${activeChat.id}`, JSON.stringify(updated));
    localStorage.setItem(`msgs_${activeChat.id}_${currentUser.id}`, JSON.stringify(updated));
    showToast('Photo uploaded!');
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showToast('Updating profile picture...');
    const avatarUrl = await uploadToCloudinary(file);

    const updated = { ...currentUser, avatar: avatarUrl };
    setCurrentUser(updated);
    localStorage.setItem('chatrio_user', JSON.stringify(updated));

    // Update in Neon DB
    queryNeon(`UPDATE users SET avatar = $1 WHERE username = $2`, [avatarUrl, currentUser.username]);

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

    // Update in Neon DB
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

    setCurrentCall({
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

    if (callType === 'video') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      } catch (err) {
        console.warn('Camera feed unavailable:', err);
      }
    }
  };

  const endCall = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCurrentCall(null);
    setIsMuted(false);
    showToast('Call ended');
  };

  if (!isLoggedIn) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#070b14] text-white p-4 font-sans relative overflow-hidden">
        <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative z-10">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Chatrio <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/30">by Zaid</span>
            </h2>
            <p className="text-xs text-slate-400 mt-2">
              {authMode === 'register' ? 'Create account with Neon DB sync' : 'Login to your Chatrio account'}
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
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl py-3 px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl py-3 px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl py-3 px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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
    <div className={`h-screen w-screen overflow-hidden flex flex-col font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#070b14] text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
      
      {/* TOAST POPUP */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-2.5 text-xs animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* HEADER */}
      <header className={`h-16 border-b px-4 flex items-center justify-between backdrop-blur-md z-20 ${theme === 'dark' ? 'border-slate-800/80 bg-[#0a0f1d]/90' : 'border-slate-200 bg-white/90'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-bold shadow-md">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg leading-tight">
              Chatrio <span className="text-xs text-emerald-400 font-medium">by Zaid</span>
            </h1>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> @{currentUser.username}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
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
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* SIDEBAR - HIDDEN ON MOBILE WHEN CHAT IS ACTIVE */}
        <aside className={`w-full sm:w-80 md:w-96 border-r flex flex-col z-10 ${mobileChatOpen ? 'hidden sm:flex' : 'flex'} ${theme === 'dark' ? 'bg-[#0b101e]/80 border-slate-800/80' : 'bg-white border-slate-200'}`}>
          
          <div className={`flex items-center border-b p-2 gap-1 ${theme === 'dark' ? 'border-slate-800/80 bg-[#070b15]' : 'border-slate-200 bg-slate-50'}`}>
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

          {/* REAL-TIME NEON DB SEARCH BAR */}
          <div className="p-3 border-b border-slate-800/60 relative">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                placeholder="Search registered @username in Neon DB..."
                className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* NEON SEARCH RESULTS */}
            {isSearching && (
              <div className="absolute top-full left-0 right-0 bg-slate-900 border border-slate-800 rounded-b-2xl shadow-2xl z-30 p-2 max-h-60 overflow-y-auto">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider px-2 py-1 font-semibold">
                  Neon DB Users
                </p>
                {searchedUsers.length === 0 ? (
                  <p className="text-xs text-slate-500 p-3 text-center">No registered user found with @{searchQuery}</p>
                ) : (
                  searchedUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => startChatWithUser(u)}
                      className="flex items-center space-x-3 p-2.5 hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                    >
                      <img src={u.avatar} className="w-9 h-9 rounded-full object-cover" alt="" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs text-white">@{u.username}</h4>
                        <p className="text-[11px] text-slate-400 truncate">{u.bio}</p>
                      </div>
                      <Plus className="w-4 h-4 text-emerald-400" />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* TABS LIST */}
          <div className="flex-1 overflow-y-auto relative">
            {activeTab === 'chats' && (
              <div className="p-2 space-y-1">
                {chats.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    <p className="font-semibold text-slate-400">No active conversations</p>
                    <p className="mt-1 text-[11px]">Type an exact registered @username in the search bar above to start messaging across devices!</p>
                  </div>
                ) : (
                  chats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => {
                        setActiveChat(chat);
                        setMobileChatOpen(true);
                      }}
                      className="flex items-center space-x-3 p-3 rounded-2xl cursor-pointer hover:bg-slate-800/40 transition-colors"
                    >
                      <img src={chat.avatar} className="w-12 h-12 rounded-full object-cover" alt="" />
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
        <main className={`flex-1 flex flex-col relative ${!mobileChatOpen ? 'hidden sm:flex' : 'flex'} ${theme === 'dark' ? 'bg-[#070b15]/90' : 'bg-slate-100'}`}>
          {!activeChat ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <MessageSquare className="w-12 h-12 text-emerald-400 mb-3" />
              <h2 className="text-xl font-bold">Chatrio by Zaid</h2>
              <p className="text-xs text-slate-400 max-w-sm mt-1">Search an exact @username to start cross-device messaging synced with Neon DB!</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className={`h-16 border-b px-4 flex items-center justify-between ${theme === 'dark' ? 'border-slate-800/80 bg-[#0a0f1e]/90' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center space-x-3">
                  <button onClick={() => setMobileChatOpen(false)} className="sm:hidden p-2 text-slate-400 hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <img src={activeChat.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                  <div>
                    <h3 className="font-bold text-sm">@{activeChat.username}</h3>
                    <p className="text-[11px] text-emerald-400">Neon DB Synced</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button onClick={() => startCall('audio')} className="p-2.5 bg-slate-800 text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><Phone className="w-4 h-4" /></button>
                  <button onClick={() => startCall('video')} className="p-2.5 bg-slate-800 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Video className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl shadow-md ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/50'}`}>
                        {msg.image && <img src={msg.image} className="max-w-xs rounded-xl mb-2 object-cover" alt="" />}
                        <p className="text-xs">{msg.text}</p>
                        <span className="text-[9px] opacity-70 block text-right mt-1">{msg.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 border-t flex items-center space-x-2">
                <label className="p-2 text-slate-400 hover:text-emerald-400 cursor-pointer transition-colors">
                  <Paperclip className="w-5 h-5" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageAttachment} />
                </label>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button onClick={handleSendMessage} className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CALL MODAL */}
      {currentCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-6 shadow-2xl">
            <img src={currentCall.peerAvatar} className="w-24 h-24 rounded-full mx-auto border-4 border-slate-800" alt="" />
            <div>
              <h3 className="text-xl font-bold">@{currentCall.peerName}</h3>
              <p className="text-xs text-emerald-400 uppercase tracking-wider font-semibold mt-1">Chatrio {currentCall.type} Call</p>
            </div>
            <button onClick={endCall} className="w-14 h-14 bg-red-600 text-white rounded-full mx-auto flex items-center justify-center shadow-lg shadow-red-600/40 hover:bg-red-700 transition-colors">
              <PhoneOff className="w-6 h-6" />
            </button>
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