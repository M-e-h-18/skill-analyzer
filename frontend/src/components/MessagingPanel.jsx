import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Check, Clock, User } from 'lucide-react';
import { 
  getMessagingRequests, 
  respondToMessagingRequest, 
  getConversations,
  getConversationMessages,
  sendMessage 
} from '../api/api';
import { toast } from 'react-toastify';

const MessagingPanel = ({ isDark, user }) => {
  const [activeTab, setActiveTab] = useState('conversations');
  const [requests, setRequests] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Determine if user is employer based on role
  const isEmployer = user?.role === 'employer';

  useEffect(() => {
    fetchRequests();
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchRequests = async () => {
    try {
      const response = await getMessagingRequests();
      console.log('Requests response:', response);
      setRequests(response.data?.requests || response.requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await getConversations();
      console.log('Conversations response:', response);
      setConversations(response.data?.conversations || response.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      setLoading(true);
      const response = await getConversationMessages(conversationId);
      console.log('Messages response:', response);
      setMessages(response.data?.messages || response.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToRequest = async (requestId, action) => {
    try {
      await respondToMessagingRequest(requestId, action);
      toast.success(`Request ${action}ed successfully`);
      fetchRequests();
      if (action === 'accept') fetchConversations();
    } catch (error) {
      console.error('Error responding to request:', error);
      toast.error('Failed to respond to request');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const response = await sendMessage(selectedConversation.id, newMessage);
      setMessages([...messages, response.message]);
      setNewMessage('');
      const updatedConvs = conversations.map(conv =>
        conv.id === selectedConversation.id
          ? { ...conv, last_message_at: response.message.timestamp }
          : conv
      );
      setConversations(updatedConvs);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  // Separate requests based on user role
  const incomingRequests = requests.filter(req => !isEmployer && req.status === 'pending');
  const sentRequests = requests.filter(req => isEmployer);
  const unreadCount = conversations.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);

  return (
    <div className={`rounded-xl border ${isDark ? 'border-cyan-400/30 bg-slate-800/50' : 'border-slate-300 bg-white'} backdrop-blur-sm overflow-hidden`}>
      <div className={`p-4 border-b ${isDark ? 'border-cyan-400/20' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MessageCircle className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Messages</h2>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'conversations'
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-blue-100 text-blue-700'
                : isDark
                ? 'text-slate-400 hover:text-slate-300'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Conversations
            {unreadCount > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-cyan-500 text-white' : 'bg-blue-600 text-white'}`}>
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'requests'
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-blue-100 text-blue-700'
                : isDark
                ? 'text-slate-400 hover:text-slate-300'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {isEmployer ? 'Sent Requests' : 'Requests'}
            {!isEmployer && incomingRequests.length > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-orange-500 text-white' : 'bg-orange-600 text-white'}`}>
                {incomingRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex h-[600px]">
        <div className={`w-1/3 border-r ${isDark ? 'border-cyan-400/20' : 'border-slate-200'} overflow-y-auto`}>
          {activeTab === 'conversations' ? (
            conversations.length === 0 ? (
              <div className={`p-8 text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 text-left transition-all border-b ${
                    selectedConversation?.id === conv.id
                      ? isDark
                        ? 'bg-cyan-500/10 border-cyan-400/30'
                        : 'bg-blue-50 border-blue-200'
                      : isDark
                      ? 'hover:bg-slate-700/50 border-slate-700'
                      : 'hover:bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {conv.participant_name || 'Unknown User'}
                        </h3>
                        {conv.unread_count > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isDark ? 'bg-cyan-500 text-white' : 'bg-blue-600 text-white'}`}>
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm truncate ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                        {conv.job_title || 'Untitled Job'}
                      </p>
                    </div>
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {formatTimestamp(conv.last_message_at)}
                    </span>
                  </div>
                </button>
              ))
            )
          ) : (
            // Show different content for employers vs candidates in requests tab
            isEmployer ? (
              // Employer view: Show sent requests
              sentRequests.length === 0 ? (
                <div className={`p-8 text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No sent messaging requests</p>
                  <p className="text-sm mt-2">Send requests from the Employer Dashboard</p>
                </div>
              ) : (
                sentRequests.map(req => (
                  <div key={req.id} className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <User className={`w-8 h-8 p-1.5 rounded-full ${isDark ? 'bg-slate-700 text-cyan-400' : 'bg-slate-100 text-blue-600'}`} />
                      <div className="flex-1">
                        <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {req.to_user_name?.trim() || req.to_user_email || 'Candidate'}
                        </h4>
                        <p className={`text-sm ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                          {req.job_title || 'Untitled Job'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        req.status === 'pending'
                          ? isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                          : req.status === 'accepted'
                          ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                          : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                      }`}>
                        {req.status || 'unknown'}
                      </span>
                    </div>
                    {req.message && (
                      <p className={`text-sm mb-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        "{req.message}"
                      </p>
                    )}
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Sent: {formatTimestamp(req.created_at)}
                    </p>
                  </div>
                ))
              )
            ) : (
              // Candidate view: Show incoming requests with accept/reject actions
              incomingRequests.length === 0 ? (
                <div className={`p-8 text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No pending messaging requests</p>
                </div>
              ) : (
                incomingRequests.map(req => (
                  <div key={req.id} className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <User className={`w-8 h-8 p-1.5 rounded-full ${isDark ? 'bg-slate-700 text-cyan-400' : 'bg-slate-100 text-blue-600'}`} />
                      <div className="flex-1">
                        <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {req.from_user_name?.trim() || req.from_user_email || 'Unknown Sender'}
                        </h4>
                        <p className={`text-sm ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                          {req.job_title || 'Untitled Job'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        req.status === 'pending'
                          ? isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                          : req.status === 'accepted'
                          ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                          : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                      }`}>
                        {req.status || 'unknown'}
                      </span>
                    </div>
                    {req.message && (
                      <p className={`text-sm mb-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        "{req.message}"
                      </p>
                    )}
                    {req.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRespondToRequest(req.id, 'accept')}
                          className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-all ${
                            isDark
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          <Check className="w-4 h-4 inline mr-1" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleRespondToRequest(req.id, 'reject')}
                          className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-all ${
                            isDark
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          <X className="w-4 h-4 inline mr-1" />
                          Reject
                        </button>
                      </div>
                    )}
                    <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {formatTimestamp(req.created_at)}
                    </p>
                  </div>
                ))
              )
            )
          )}
        </div>

        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              <div className={`p-4 border-b ${isDark ? 'border-cyan-400/20' : 'border-slate-200'}`}>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {selectedConversation.participant_name}
                </h3>
                <p className={`text-sm ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                  {selectedConversation.job_title}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className={`w-8 h-8 border-4 rounded-full animate-spin ${
                      isDark ? 'border-cyan-400 border-t-transparent' : 'border-blue-600 border-t-transparent'
                    }`} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className={`text-center py-12 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isOwn = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id || idx} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                          <div className={`px-4 py-2 rounded-lg ${
                            isOwn
                              ? isDark
                                ? 'bg-cyan-500 text-white'
                                : 'bg-blue-600 text-white'
                              : isDark
                              ? 'bg-slate-700 text-white'
                              : 'bg-slate-100 text-slate-800'
                          }`}>
                            <p className="text-sm">{msg.content}</p>
                          </div>
                          <span className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formatTimestamp(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className={`p-4 border-t ${isDark ? 'border-cyan-400/20' : 'border-slate-200'}`}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      isDark
                        ? 'bg-slate-900 border-cyan-400/30 text-white placeholder-slate-500'
                        : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                    } focus:outline-none focus:ring-2 ${
                      isDark ? 'focus:ring-cyan-400' : 'focus:ring-blue-600'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      isDark
                        ? 'bg-cyan-500 text-white hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400'
                    }`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className={`flex-1 flex items-center justify-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagingPanel;