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
  MicOff,
  VideoOff,
  PhoneOff,
  Sun,
  Moon,
  LogOut,
  CheckCheck,
  Camera,
  Edit3,
  X,
  UploadCloud,
  CheckCircle2,
  Database
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
  const [activeChatId, setActiveChatId] = useState(null);

  // Username Search Query
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Modals & Calls
  const [showCreateStatusModal, setShowCreateStatusModal] = useState(false);
  const [activeStatusViewer, setActiveStatusViewer] = useState(null);

  const [currentCall, setCurrentCall] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const ringIntervalRef = useRef(null);

  // Inputs & Toast Notifications
  const [messageInput, setMessageInput] = useState('');
  const [statusTextInput, setStatusTextInput] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Profile Edit State
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    bio: ''
  });

  // Completely FRESH empty states - No dummy data
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [callLogs, setCallLogs] = useState([]);

  useEffect(() => {
    // Sync dark mode class
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Load saved logged-in session from localStorage if available
    try {
      const savedUser = localStorage.getItem('chatrio_user');
      const savedDirectory = localStorage.getItem('chatrio_registered_users');
      
      if (savedDirectory) {
        setRegisteredUsers(JSON.parse(savedDirectory));
      }

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
      console.error('Failed to load local storage session:', err);
    }
  }, [theme]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const uploadToCloudinary = async (file) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error('Cloudinary upload failed');
      }

      const data = await response.json();
      setIsUploading(false);
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary Upload Error:', error);
      setIsUploading(false);
      // Fallback local reader preview
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    if (authMode === 'register') {
      if (!authForm.username || !authForm.email || !authForm.password) {
        showToast('Please fill in all fields!');
        return;
      }

      // Check if username already exists
      const existingUser = registeredUsers.find(
        (u) => u.username.toLowerCase() === authForm.username.toLowerCase()
      );

      if (existingUser) {
        showToast('Username already taken. Please pick another one.');
        return;
      }

      const newUser = {
        id: 'usr_' + Date.now(),
        username: authForm.username.trim(),
        email: authForm.email.trim(),
        password: authForm.password,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        bio: 'Hey there! I am using Chatrio by Zaid 🚀'
      };

      const updatedUsers = [...registeredUsers, newUser];
      setRegisteredUsers(updatedUsers);
      localStorage.setItem('chatrio_registered_users', JSON.stringify(updatedUsers));

      setCurrentUser(newUser);
      setProfileForm({
        username: newUser.username,
        email: newUser.email,
        bio: newUser.bio
      });

      localStorage.setItem('chatrio_user', JSON.stringify(newUser));
      setIsLoggedIn(true);
      showToast(`Welcome to Chatrio by Zaid, @${newUser.username}! 🎉`);
    } else {
      // Login mode
      const userMatch = registeredUsers.find(
        (u) =>
          u.username.toLowerCase() === authForm.username.toLowerCase() &&
          u.password === authForm.password
      );

      if (userMatch) {
        setCurrentUser(userMatch);
        setProfileForm({
          username: userMatch.username,
          email: userMatch.email,
          bio: userMatch.bio || 'Hey there! I am using Chatrio by Zaid 🚀'
        });
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
    setActiveChatId(null);
    showToast('Logged out successfully');
  };

  const handleSearchUsers = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchedUsers([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const matches = registeredUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(query.toLowerCase()) &&
        u.id !== currentUser.id
    );
    setSearchedUsers(matches);
  };

  const startChatWithUser = (targetUser) => {
    // Check if chat already exists
    let existingChat = chats.find((c) => c.peerUserId === targetUser.id);

    if (!existingChat) {
      existingChat = {
        id: 'chat_' + Date.now(),
        peerUserId: targetUser.id,
        name: targetUser.username,
        avatar: targetUser.avatar,
        bio: targetUser.bio,
        online: true,
        unread: 0,
        messages: []
      };
      setChats((prev) => [existingChat, ...prev]);
    }

    setActiveChatId(existingChat.id);
    setSearchQuery('');
    setSearchedUsers([]);
    setIsSearching(false);
    setActiveTab('chats');
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChatId) return;

    const currentChat = chats.find((c) => c.id === activeChatId);
    if (!currentChat) return;

    const newMsg = {
      id: 'msg_' + Date.now(),
      senderId: currentUser.id,
      text: messageInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id === activeChatId) {
          return {
            ...chat,
            messages: [...chat.messages, newMsg]
          };
        }
        return chat;
      })
    );

    setMessageInput('');
  };

  const handleImageAttachment = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChatId) return;

    showToast('Uploading image to Cloudinary...');
    const imageUrl = await uploadToCloudinary(file);

    const newMsg = {
      id: 'msg_' + Date.now(),
      senderId: currentUser.id,
      text: '📷 Photo Attachment',
      image: imageUrl,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id === activeChatId) {
          return {
            ...chat,
            messages: [...chat.messages, newMsg]
          };
        }
        return chat;
      })
    );
    showToast('Photo uploaded!');
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showToast('Updating profile picture on Cloudinary...');
    const avatarUrl = await uploadToCloudinary(file);

    const updated = { ...currentUser, avatar: avatarUrl };
    setCurrentUser(updated);
    localStorage.setItem('chatrio_user', JSON.stringify(updated));

    // Also update in registered user directory
    setRegisteredUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, avatar: avatarUrl } : u))
    );

    showToast('Profile photo updated successfully!');
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

    setRegisteredUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? updated : u))
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
    const currentChat = chats.find((c) => c.id === activeChatId);
    if (!currentChat) return;

    setCurrentCall({
      type: callType,
      peerName: currentChat.name,
      peerAvatar: currentChat.avatar,
      startTime: Date.now()
    });

    // Add to Call Logs
    const newCallLog = {
      id: 'call_' + Date.now(),
      name: currentChat.name,
      avatar: currentChat.avatar,
      type: callType,
      direction: 'outgoing',
      time: 'Just now'
    };
    setCallLogs((prev) => [newCallLog, ...prev]);

    // Request camera feed for video
    if (callType === 'video') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
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
    setIsCamOff(false);
    showToast('Call ended');
  };

  if (!isLoggedIn) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#070b14] text-white p-4 font-sans">
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Chatrio <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">by Zaid</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {authMode === 'register'
                ? 'Create a fresh account with your @username'
                : 'Enter your credentials to log in'}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Username (@)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. zaidkhan"
                  value={authForm.username}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, username: e.target.value })
                  }
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="zaid@chatrio.com"
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({ ...authForm, email: e.target.value })
                }
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm({ ...authForm, password: e.target.value })
                }
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2"
            >
              <span>{authMode === 'register' ? 'Register Account' : 'Log In'}</span>
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            {authMode === 'register' ? (
              <p>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-emerald-400 font-semibold hover:underline"
                >
                  Log In
                </button>
              </p>
            ) : (
              <p>
                Need an account?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="text-emerald-400 font-semibold hover:underline"
                >
                  Create One
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const activeChat = chats.find((c) => c.id === activeChatId);

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#070b14] text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
      
      {/* TOAST NOTIFICATION POPUP */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 text-xs animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <header className={`h-16 border-b px-4 flex items-center justify-between backdrop-blur-md z-20 ${theme === 'dark' ? 'border-slate-800/80 bg-[#0a0f1d]/90' : 'border-slate-200 bg-white/90'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-bold shadow-md shadow-emerald-500/10">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">
              Chatrio <span className="text-xs text-emerald-400 font-medium">by Zaid</span>
            </h1>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> @{currentUser.username}
            </p>
          </div>
        </div>

        {/* HEADER CONTROLS */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 flex items-center justify-center text-slate-300 transition-all"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>

          <div
            onClick={() => setActiveTab('profile')}
            className="flex items-center space-x-2 cursor-pointer bg-slate-800/40 p-1 pr-3 rounded-full hover:bg-slate-800/80 transition-all border border-slate-700/50"
          >
            <img src={currentUser.avatar} className="w-8 h-8 rounded-full object-cover" alt="Profile" />
            <span className="text-xs font-semibold max-w-[90px] truncate hidden sm:inline-block">
              @{currentUser.username}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all border border-red-500/20"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT SIDEBAR NAVIGATION & SEARCH */}
        <aside className={`w-full sm:w-80 md:w-96 border-r flex flex-col z-10 transition-all duration-300 ${theme === 'dark' ? 'bg-[#0b101e]/80 border-slate-800/80' : 'bg-white border-slate-200'}`}>
          
          {/* NAVIGATION TABS */}
          <div className={`flex items-center border-b p-2 gap-1 ${theme === 'dark' ? 'border-slate-800/80 bg-[#070b15]' : 'border-slate-200 bg-slate-50'}`}>
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'chats' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <MessageSquare className="w-4 h-4" /> Chats
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'status' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Circle className="w-4 h-4" /> Status
            </button>
            <button
              onClick={() => setActiveTab('calls')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'calls' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Phone className="w-4 h-4" /> Calls
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'profile' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <User className="w-4 h-4" /> Profile
            </button>
          </div>

          {/* USERNAME SEARCH BAR */}
          <div className="p-3 border-b border-slate-800/60 relative">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                placeholder="Search registered @username..."
                className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            {/* SEARCH RESULTS DROPDOWN */}
            {isSearching && (
              <div className="absolute top-full left-0 right-0 bg-slate-900 border border-slate-800 rounded-b-2xl shadow-2xl z-30 p-2 max-h-60 overflow-y-auto">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider px-2 py-1 font-semibold">
                  Search Results
                </p>
                {searchedUsers.length === 0 ? (
                  <p className="text-xs text-slate-500 p-2 text-center">No user found with @{searchQuery}</p>
                ) : (
                  searchedUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => startChatWithUser(u)}
                      className="flex items-center space-x-3 p-2.5 hover:bg-slate-800 rounded-xl cursor-pointer transition-all"
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

          {/* SIDEBAR TABS CONTENT */}
          <div className="flex-1 overflow-y-auto relative">
            
            {/* 1. CHATS TAB */}
            {activeTab === 'chats' && (
              <div className="p-2 space-y-1">
                {chats.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    <p>No active chats yet.</p>
                    <p className="mt-1 text-[11px]">Use the top search bar to find registered users by @username!</p>
                  </div>
                ) : (
                  chats.map((chat) => {
                    const lastMsg = chat.messages[chat.messages.length - 1] || { text: 'No messages yet', time: '' };
                    const isActive = chat.id === activeChatId;

                    return (
                      <div
                        key={chat.id}
                        onClick={() => setActiveChatId(chat.id)}
                        className={`flex items-center space-x-3 p-3 rounded-2xl cursor-pointer transition-all border border-transparent ${
                          isActive ? 'bg-slate-800/80 border-slate-700/60' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <img src={chat.avatar} className="w-12 h-12 rounded-full object-cover" alt="" />
                          <span className="w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 absolute bottom-0 right-0"></span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm truncate">@{chat.name}</h4>
                            <span className="text-[10px] text-slate-400">{lastMsg.time}</span>
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{lastMsg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* 2. STATUS TAB */}
            {activeTab === 'status' && (
              <div className="p-3 space-y-4">
                <div
                  onClick={() => setShowCreateStatusModal(true)}
                  className="flex items-center space-x-3 p-3 bg-slate-800/40 hover:bg-slate-800/80 rounded-2xl cursor-pointer border border-slate-700/40 transition-all"
                >
                  <div className="relative">
                    <img src={currentUser.avatar} className="w-12 h-12 rounded-full object-cover" alt="" />
                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-slate-900">+</div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">My Status</h4>
                    <p className="text-xs text-slate-400">Tap to post status update</p>
                  </div>
                </div>

                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 pt-2">Recent Updates</div>
                <div className="space-y-2">
                  {statuses.length === 0 ? (
                    <p className="text-xs text-slate-500 p-3 text-center">No status updates yet.</p>
                  ) : (
                    statuses.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => setActiveStatusViewer(st)}
                        className="flex items-center space-x-3 p-3 bg-slate-800/30 hover:bg-slate-800/70 rounded-2xl cursor-pointer transition-all border border-slate-700/30"
                      >
                        <div className="p-0.5 bg-gradient-to-tr from-emerald-400 to-blue-500 rounded-full">
                          <img src={st.avatar} className="w-11 h-11 rounded-full object-cover border-2 border-slate-900" alt="" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">@{st.username}</h4>
                          <p className="text-xs text-slate-400">{st.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 3. CALL LOGS TAB */}
            {activeTab === 'calls' && (
              <div className="p-2 space-y-1">
                <div className="p-3 text-xs text-slate-400 font-semibold uppercase tracking-wide">Recent Calls</div>
                {callLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 text-center">No recent calls.</p>
                ) : (
                  callLogs.map((call) => (
                    <div key={call.id} className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-slate-800/40 transition-all">
                      <img src={call.avatar} className="w-11 h-11 rounded-full object-cover" alt="" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">@{call.name}</h4>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          {call.type === 'video' ? <Video className="w-3 h-3 text-emerald-400" /> : <Phone className="w-3 h-3 text-blue-400" />}
                          {call.time}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 4. PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="p-4 space-y-5">
                <div className="flex flex-col items-center text-center pt-2">
                  <div className="relative group cursor-pointer">
                    <img src={currentUser.avatar} className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500/80 shadow-xl" alt="" />
                    <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs font-medium cursor-pointer">
                      <Camera className="w-5 h-5 text-white mb-1" />
                      <span>Upload Cloudinary</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </label>
                  </div>

                  <h3 className="mt-3 font-bold text-lg">@{currentUser.username}</h3>
                  <p className="text-xs text-emerald-400 font-medium">{currentUser.email}</p>
                </div>

                <div className="space-y-3.5 pt-2">
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
                    <label className="text-xs text-slate-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
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

                  <button
                    onClick={handleSaveProfile}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs transition-all shadow-lg shadow-emerald-600/30"
                  >
                    Save Profile Details
                  </button>
                </div>
              </div>
            )}

          </div>
        </aside>

        {/* RIGHT MAIN CHAT AREA */}
        <main className={`flex-1 flex flex-col relative ${theme === 'dark' ? 'bg-[#070b15]/90' : 'bg-slate-100'}`}>
          {!activeChat ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-20 h-20 bg-slate-800/60 rounded-full flex items-center justify-center mb-4 text-emerald-400 border border-slate-700/50 shadow-xl">
                <MessageSquare className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-slate-200">
                Chatrio <span className="text-emerald-400 text-sm font-normal">by Zaid</span>
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                Search registered users by @username to start instant messaging, high quality video calls, and photo sharing.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* ACTIVE CHAT HEADER */}
              <div className={`h-16 border-b px-4 flex items-center justify-between backdrop-blur-md ${theme === 'dark' ? 'border-slate-800/80 bg-[#0a0f1e]/90' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center space-x-3">
                  <img src={activeChat.avatar} className="w-10 h-10 rounded-full object-cover border border-slate-700" alt="" />
                  <div>
                    <h3 className="font-bold text-sm leading-tight">@{activeChat.name}</h3>
                    <p className="text-[11px] text-emerald-400">Online</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startCall('audio')}
                    className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-emerald-600 text-emerald-400 hover:text-white flex items-center justify-center transition-all border border-slate-700/50"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startCall('video')}
                    className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-blue-600 text-blue-400 hover:text-white flex items-center justify-center transition-all border border-slate-700/50"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* MESSAGES DISPLAY AREA */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {activeChat.messages.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 my-auto pt-10">Say hi to @{activeChat.name}! 👋</p>
                ) : (
                  activeChat.messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;

                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] p-3 rounded-2xl shadow-md ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/50'}`}>
                          {msg.image && (
                            <img src={msg.image} className="max-w-xs rounded-xl mb-2 object-cover" alt="" />
                          )}
                          <p className="text-xs leading-relaxed">{msg.text}</p>
                          <span className="text-[9px] opacity-70 block text-right mt-1">{msg.time}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* CHAT INPUT BAR */}
              <div className={`p-3 border-t flex items-center space-x-2 ${theme === 'dark' ? 'border-slate-800/80 bg-[#0a0f1e]/90' : 'border-slate-200 bg-white'}`}>
                <label className="p-2.5 text-slate-400 hover:text-emerald-400 cursor-pointer transition-colors">
                  <Paperclip className="w-5 h-5" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageAttachment} />
                </label>

                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-800/80 border border-slate-700/80 rounded-2xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                />

                <button
                  onClick={handleSendMessage}
                  className="w-10 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}
        </main>
      </div>

      {/* AUDIO / VIDEO CALL MODAL */}
      {currentCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-between min-h-[480px] relative overflow-hidden shadow-2xl">
            
            {currentCall.type === 'video' && (
              <div className="absolute inset-0 w-full h-full bg-slate-950">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                <div className="absolute bottom-20 right-6 w-32 h-44 bg-slate-800 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-2xl">
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                </div>
              </div>
            )}

            <div className="z-10 text-center pt-8">
              <img src={currentCall.peerAvatar} className="w-24 h-24 rounded-full object-cover border-4 border-slate-700 shadow-xl mx-auto mb-3" alt="" />
              <h3 className="text-2xl font-bold text-white">@{currentCall.peerName}</h3>
              <p className="text-xs uppercase tracking-widest text-emerald-400 font-semibold mt-1">
                Chatrio {currentCall.type.toUpperCase()} Call
              </p>
            </div>

            <div className="z-10 flex items-center space-x-6 pb-6">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all shadow-lg border border-slate-700 ${isMuted ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all shadow-xl shadow-red-600/40"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE STATUS MODAL */}
      {showCreateStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-white">Post New Status</h3>
              <button onClick={() => setShowCreateStatusModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <textarea
                value={statusTextInput}
                onChange={(e) => setStatusTextInput(e.target.value)}
                placeholder="What is on your mind?"
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handlePublishStatus}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all"
              >
                Publish Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW STATUS MODAL */}
      {activeStatusViewer && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md h-full flex flex-col justify-between py-6">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-3">
                <img src={activeStatusViewer.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                <div>
                  <h4 className="font-bold text-sm">@{activeStatusViewer.username}</h4>
                  <p className="text-xs text-slate-400">{activeStatusViewer.time}</p>
                </div>
              </div>
              <button onClick={() => setActiveStatusViewer(null)} className="text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="text-center text-xl font-bold text-white my-auto px-4">
              "{activeStatusViewer.text}"
            </div>
          </div>
        </div>
      )}

    </div>
  );
}