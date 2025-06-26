import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, Bot, User, MessageCircle, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logChatMessage } from '../lib/supabaseClient';
import { callFastAPI } from '../lib/fastApiClient';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

function ChatPage() {
  const { user, userProfile, signOut } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Get display name (username from profile or email fallback)
  const getDisplayName = () => {
    if (userProfile?.username) {
      return userProfile.username;
    }
    return user?.email?.split('@')[0] || 'there';
  };

  // Initialize with default welcome message
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: `Hello ${getDisplayName()}! I'm your AI Interview Coach. I'm here to help you prepare for your upcoming interviews. What would you like to work on today?`,
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clean markdown formatting from AI responses
  const cleanMarkdownFormatting = (text: string): string => {
    return text
      .replace(/^#{1,6}\s+/gm, '') // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markers
      .replace(/^[-*+]\s+/gm, '• ') // Convert bullet points
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .trim();
  };

  const handleSendMessage = async () => {
    // Strict validation - prevent any sending if conditions aren't met
    if (!inputText.trim() || isTyping || !user) {
      console.log('Send blocked:', { 
        hasInput: !!inputText.trim(), 
        isTyping, 
        hasUser: !!user 
      });
      return;
    }

    const currentInput = inputText.trim();
    console.log('Sending message:', currentInput);
    
    // Immediately clear input and set typing state
    setInputText('');
    setIsTyping(true);

    // Create user message with unique ID
    const userMessage: Message = {
      id: Date.now(), // Use timestamp for unique ID
      text: currentInput,
      sender: 'user',
      timestamp: new Date()
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);

    try {
      // Call FastAPI and get JSON response
      console.log('Calling FastAPI...');
      const apiResponse = await callFastAPI(user.email || 'anonymous', currentInput);
      console.log('FastAPI response received:', apiResponse);
      
      // Extract the reply from the JSON response
      const aiReplyText = apiResponse?.reply || 'No response received from AI.';
      
      // Clean the response text
      const cleanedResponse = cleanMarkdownFormatting(aiReplyText);
      
      // Create AI response message with unique ID
      const aiResponse: Message = {
        id: Date.now() + 1, // Ensure unique ID
        text: cleanedResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      
      // Add AI response to chat
      setMessages(prev => [...prev, aiResponse]);

      // Log the conversation to Supabase (don't await to avoid blocking UI)
      logChatMessage(currentInput, aiReplyText).catch(error => {
        console.error('Error logging chat message:', error);
      });
      
    } catch (error) {
      console.error('Error calling FastAPI:', error);
      
      // Add error message to chat
      const errorResponse: Message = {
        id: Date.now() + 2,
        text: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      // Always reset typing state
      console.log('Resetting typing state');
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    
    setSigningOut(true);
    try {
      console.log('Sign out button clicked from chat page');
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/auth';
    } finally {
      setSigningOut(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black flex flex-col">
      {/* Header */}
      <header className="backdrop-blur-xl bg-black/60 border-b border-blue-500/20 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              to="/"
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors duration-300 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Dashboard</span>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI Interview Coach</h1>
                <p className="text-sm text-gray-400">Chat & Practice</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
              {getDisplayName()}
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center space-x-2 text-sm text-gray-300 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signingOut ? (
                <>
                  <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                  <span>Signing Out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-4 ${
                message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                message.sender === 'ai' 
                  ? 'bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/40' 
                  : 'bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/40'
              }`}>
                {message.sender === 'ai' ? (
                  <Bot className="w-5 h-5 text-white" />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-2xl ${message.sender === 'user' ? 'ml-auto' : ''}`}>
                <div className={`p-4 rounded-2xl backdrop-blur-sm border transition-all duration-300 hover:scale-[1.02] ${
                  message.sender === 'ai'
                    ? 'bg-white/5 border-white/10 text-gray-100 hover:bg-white/10'
                    : 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-blue-500/30 text-white hover:from-blue-600/30 hover:to-cyan-600/30'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                </div>
                <div className={`text-xs text-gray-500 mt-2 ${
                  message.sender === 'user' ? 'text-right' : 'text-left'
                }`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/40">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-white/10 bg-black/60 backdrop-blur-xl p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-4">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isTyping ? "AI is thinking..." : "Ask me anything about interview preparation..."}
                className="w-full p-4 pr-12 bg-white/5 border border-white/10 rounded-2xl text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 focus:bg-white/10 resize-none"
                disabled={isTyping}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isTyping}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-4 rounded-2xl transition-all duration-300 shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-110 active:scale-95 flex items-center justify-center"
            >
              {isTyping ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            {isTyping ? "Please wait while AI responds..." : "Press Enter to send • Shift + Enter for new line"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;