import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Mic, Send, History, BarChart3, CheckCircle, AlertCircle, TrendingUp, Users, Clock, MessageCircle, LogOut, Sparkles, Bot, Lightbulb, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { submitInterviewAnswer, getUserInterviewHistory } from '../lib/supabaseClient';
import { callFastAPI } from '../lib/fastApiClient';

interface FeedbackScore {
  label: string;
  score: number | null;
  displayScore: string;
  color: string;
}

interface Issue {
  type: 'warning' | 'error' | 'success';
  message: string;
}

interface HistoryItem {
  id: number;
  question: string;
  created_at: string;
  structure_score: number;
  clarity_score: number;
  tone_score: number;
}

interface ChatResponse {
  reply: string;
  total_questions: number;
  question_types: {
    DSA: number;
    HR: number;
    General: number;
  };
}

interface FeedbackResponse {
  reply: string;
  structure_score?: number | null;
  clarity_score?: number | null;
  tone_score?: number | null;
  relevance_score?: number | null;
  issues?: Issue[];
  suggestions?: string[];
  improved_answer?: string;
}

function InterviewDashboard() {
  const { user, userProfile, signOut } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [questionCount, setQuestionCount] = useState(0);
  const [answer, setAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [questionRequest, setQuestionRequest] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const cursorGlowRef = useRef<HTMLDivElement>(null);

  // Get display name (username from profile or email fallback)
  const getDisplayName = () => {
    if (userProfile?.username) {
      return userProfile.username;
    }
    return user?.email?.split('@')[0] || 'there';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cursorGlowRef.current) {
        cursorGlowRef.current.style.transform = `translate(${e.clientX - 300}px, ${e.clientY - 300}px)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    loadHistory();
    // Start with question count at 0, no initial question
  }, []);

  const loadHistory = async () => {
    try {
      const historyData = await getUserInterviewHistory();
      setHistory(historyData.map((item: any) => ({
        id: item.id,
        question: item.question,
        created_at: new Date(item.created_at).toLocaleDateString(),
        structure_score: item.structure_score,
        clarity_score: item.clarity_score,
        tone_score: item.tone_score
      })));
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadNextQuestion = async () => {
    setLoadingQuestion(true);
    try {
      // Always generate a general question via API when "Next Question" is clicked
      const data = await callFastAPI(
        user?.email || 'anonymous', 
        'Generate one general interview question. Return only the question text, nothing else. Make it a behavioral or technical question suitable for a job interview.'
      );
      
      // Extract and clean the question from the response
      let question = data.reply.trim();
      
      // Remove any extra formatting, numbering, or prefixes
      question = question
        .replace(/^\d+\.\s*/, '') // Remove numbering like "1. "
        .replace(/^Question:\s*/i, '') // Remove "Question:" prefix
        .replace(/^Q:\s*/i, '') // Remove "Q:" prefix
        .replace(/^\*\s*/, '') // Remove bullet points
        .replace(/^-\s*/, '') // Remove dashes
        .trim();
      
      // Take only the first line if there are multiple lines
      if (question.includes('\n')) {
        question = question.split('\n')[0].trim();
      }
      
      // Ensure it's a proper question
      if (question && !question.endsWith('?') && !question.endsWith('.')) {
        // Only add question mark if it seems like a question
        if (question.toLowerCase().includes('tell me') || 
            question.toLowerCase().includes('describe') || 
            question.toLowerCase().includes('explain') ||
            question.toLowerCase().includes('how') ||
            question.toLowerCase().includes('what') ||
            question.toLowerCase().includes('why') ||
            question.toLowerCase().includes('when') ||
            question.toLowerCase().includes('where')) {
          question += '?';
        }
      }
      
      // Fallback if question is empty or too short
      if (!question || question.length < 10) {
        const fallbackQuestions = [
          "Tell me about a challenging project you worked on and how you overcame the obstacles.",
          "Describe a time when you had to work with a difficult team member. How did you handle it?",
          "What's your approach to handling tight deadlines and multiple priorities?",
          "Tell me about a time you had to learn a new technology or skill quickly.",
          "Describe a situation where you had to give constructive feedback to a colleague."
        ];
        question = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
      }
      
      setCurrentQuestion(question);
      setQuestionCount(prev => prev + 1);
    } catch (error) {
      console.error('Error loading question:', error);
      // Fallback questions if API fails
      const fallbackQuestions = [
        "Tell me about a challenging project you worked on and how you overcame the obstacles.",
        "Describe a time when you had to work with a difficult team member. How did you handle it?",
        "What's your approach to handling tight deadlines and multiple priorities?",
        "Tell me about a time you had to learn a new technology or skill quickly.",
        "Describe a situation where you had to give constructive feedback to a colleague.",
        "How do you stay updated with the latest trends in your field?",
        "Tell me about a time you made a mistake at work. How did you handle it?",
        "Describe your problem-solving process when faced with a complex technical issue."
      ];
      const randomQuestion = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
      setCurrentQuestion(randomQuestion);
      setQuestionCount(prev => prev + 1);
    } finally {
      setLoadingQuestion(false);
    }
  };

  const extractNumberFromRequest = (request: string): number => {
    // Look for numbers in the request
    const numberMatch = request.match(/(\d+)/);
    if (numberMatch) {
      const num = parseInt(numberMatch[1]);
      // Cap at reasonable limits
      return Math.min(Math.max(num, 1), 10);
    }
    return 3; // Default to 3 if no number found
  };

  const handleGenerateQuestions = async () => {
    if (!questionRequest.trim()) return;

    setIsGenerating(true);
    try {
      // Extract the requested number of questions
      const requestedCount = extractNumberFromRequest(questionRequest);
      
      // Create a more specific prompt
      const prompt = `Generate exactly ${requestedCount} interview questions based on this request: "${questionRequest}". 

IMPORTANT INSTRUCTIONS:
- Generate EXACTLY ${requestedCount} questions, no more, no less
- Each question should be on a separate line
- Do not include numbering, bullets, or prefixes
- Make each question clear and interview-appropriate
- Focus on the specific topics mentioned in the request

Example format:
Tell me about your experience with data structures
Explain how you would implement a binary search algorithm
Describe a time when you optimized code performance`;

      const data = await callFastAPI(user?.email || 'anonymous', prompt);
      
      // Parse the response to extract exactly the requested number of questions
      let questions = data.reply.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 10) // Filter out very short lines
        .map(line => {
          // Clean up each question
          return line
            .replace(/^\d+\.\s*/, '') // Remove numbering
            .replace(/^Question:\s*/i, '') // Remove "Question:" prefix
            .replace(/^Q:\s*/i, '') // Remove "Q:" prefix
            .replace(/^\*\s*/, '') // Remove bullet points
            .replace(/^-\s*/, '') // Remove dashes
            .trim();
        })
        .filter(line => line.length > 10); // Filter again after cleaning
      
      // Ensure we have exactly the requested number of questions
      if (questions.length > requestedCount) {
        questions = questions.slice(0, requestedCount);
      } else if (questions.length < requestedCount) {
        // If we don't have enough questions, try to extract more from the response
        // or generate fallback questions
        while (questions.length < requestedCount) {
          const fallbackQuestions = [
            "Tell me about your problem-solving approach.",
            "Describe a challenging situation you faced recently.",
            "How do you handle working under pressure?",
            "What motivates you in your work?",
            "Describe your ideal work environment."
          ];
          const randomFallback = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
          if (!questions.includes(randomFallback)) {
            questions.push(randomFallback);
          }
        }
      }
      
      if (questions.length > 0) {
        setGeneratedQuestions(questions);
        setShowGenerator(true);
        // Reset interview questions when custom questions are generated
        setCurrentQuestion('');
        setQuestionCount(0);
        setAnswer('');
        setShowFeedback(false);
        setFeedbackData(null);
      }
      
      setQuestionRequest('');
    } catch (error) {
      console.error('Error generating questions:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseGeneratedQuestion = (question: string) => {
    // Set the selected question as current and reset everything
    setCurrentQuestion(question);
    setQuestionCount(1);
    setAnswer('');
    setShowFeedback(false);
    setFeedbackData(null);
    setShowGenerator(false);
  };

  const handleNextQuestion = async () => {
    setAnswer('');
    setShowFeedback(false);
    setFeedbackData(null);
    // Always load a general question from API
    await loadNextQuestion();
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) return;

    setSubmitting(true);
    try {
      // Get feedback from FastAPI
      const feedbackPrompt = `Please analyze this interview answer and provide comprehensive feedback:

Question: ${currentQuestion}
Answer: ${answer}

Please provide:
1. Structure score (0-100)
2. Clarity score (0-100) 
3. Tone score (0-100)
4. Relevance score (0-100)
5. Issues found (list specific problems)
6. Suggestions for improvement (actionable advice)
7. An improved version of the answer that demonstrates best practices

Format your response clearly with sections for each component.`;

      const feedbackResponse = await callFastAPI(user?.email || 'anonymous', feedbackPrompt);
      
      // Parse the feedback response to extract scores
      const parsedFeedback = parseFeedbackResponse(feedbackResponse);
      setFeedbackData(parsedFeedback);

      // Submit to Supabase with actual scores (use 0 for null values)
      await submitInterviewAnswer({
        question: currentQuestion,
        answer_text: answer,
        structure_score: parsedFeedback.structure_score ?? 0,
        clarity_score: parsedFeedback.clarity_score ?? 0,
        tone_score: parsedFeedback.tone_score ?? 0,
        issues: JSON.stringify(parsedFeedback.issues || []),
        suggestions: JSON.stringify(parsedFeedback.suggestions || [])
      });

      setShowFeedback(true);
      await loadHistory(); // Refresh history
    } catch (error) {
      console.error('Error submitting answer:', error);
      // Show feedback with null scores if API fails
      setFeedbackData({
        reply: "Unable to get detailed feedback at this time.",
        structure_score: null,
        clarity_score: null,
        tone_score: null,
        relevance_score: null,
        issues: [],
        suggestions: ["Please try again for detailed feedback."],
        improved_answer: "Improved answer example not available at this time."
      });
      setShowFeedback(true);
    } finally {
      setSubmitting(false);
    }
  };

  const parseFeedbackResponse = (response: any): FeedbackResponse => {
    const reply = response.reply || '';
    
    // Check if the response has direct score properties
    let structureScore = response.structure_score;
    let clarityScore = response.clarity_score;
    let toneScore = response.tone_score;
    let relevanceScore = response.relevance_score;
    
    // If not found in direct properties, try to extract from text
    if (structureScore === undefined || structureScore === null) {
      const structureMatch = reply.match(/structure\s*(?:score)?[:\s]*(\d+)/i);
      structureScore = structureMatch ? parseInt(structureMatch[1]) : null;
    }
    
    if (clarityScore === undefined || clarityScore === null) {
      const clarityMatch = reply.match(/clarity\s*(?:score)?[:\s]*(\d+)/i);
      clarityScore = clarityMatch ? parseInt(clarityMatch[1]) : null;
    }
    
    if (toneScore === undefined || toneScore === null) {
      const toneMatch = reply.match(/tone\s*(?:score)?[:\s]*(\d+)/i);
      toneScore = toneMatch ? parseInt(toneMatch[1]) : null;
    }
    
    if (relevanceScore === undefined || relevanceScore === null) {
      const relevanceMatch = reply.match(/relevance\s*(?:score)?[:\s]*(\d+)/i);
      relevanceScore = relevanceMatch ? parseInt(relevanceMatch[1]) : null;
    }
    
    // Extract issues and suggestions from the response
    const issuesSection = reply.match(/issues?[:\s]*(.*?)(?=suggestions?|improved|$)/is);
    const suggestionsSection = reply.match(/suggestions?[:\s]*(.*?)(?=improved|$)/is);
    const improvedSection = reply.match(/improved\s*(?:answer|version|response)?[:\s]*(.*?)$/is);
    
    const issues: Issue[] = [];
    const suggestions: string[] = [];
    let improvedAnswer = '';
    
    if (issuesSection && issuesSection[1]) {
      const issueLines = issuesSection[1].split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[-*•]\s*/, '').trim())
        .filter(line => line.length > 0);
      
      issueLines.forEach(issue => {
        issues.push({
          type: 'warning',
          message: issue
        });
      });
    }
    
    if (suggestionsSection && suggestionsSection[1]) {
      const suggestionLines = suggestionsSection[1].split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[-*•]\s*/, '').trim())
        .filter(line => line.length > 0);
      
      suggestions.push(...suggestionLines);
    }
    
    if (improvedSection && improvedSection[1]) {
      improvedAnswer = improvedSection[1].trim();
    }
    
    return {
      reply,
      structure_score: structureScore,
      clarity_score: clarityScore,
      tone_score: toneScore,
      relevance_score: relevanceScore,
      issues,
      suggestions,
      improved_answer: improvedAnswer
    };
  };

  const getFeedbackScores = (): FeedbackScore[] => {
    if (!feedbackData) return [];
    
    const formatScore = (score: number | null | undefined): { score: number | null, displayScore: string } => {
      if (score === null || score === undefined) {
        return { score: null, displayScore: 'N/A' };
      }
      return { score, displayScore: `${score}%` };
    };
    
    const structureFormatted = formatScore(feedbackData.structure_score);
    const clarityFormatted = formatScore(feedbackData.clarity_score);
    const toneFormatted = formatScore(feedbackData.tone_score);
    const relevanceFormatted = formatScore(feedbackData.relevance_score);
    
    return [
      { 
        label: "Structure", 
        score: structureFormatted.score, 
        displayScore: structureFormatted.displayScore,
        color: "text-blue-400" 
      },
      { 
        label: "Clarity", 
        score: clarityFormatted.score, 
        displayScore: clarityFormatted.displayScore,
        color: "text-cyan-400" 
      },
      { 
        label: "Tone", 
        score: toneFormatted.score, 
        displayScore: toneFormatted.displayScore,
        color: "text-green-400" 
      },
      { 
        label: "Relevance", 
        score: relevanceFormatted.score, 
        displayScore: relevanceFormatted.displayScore,
        color: "text-yellow-400" 
      }
    ];
  };

  const handleSignOut = async () => {
    if (signingOut) return; // Prevent multiple clicks
    
    setSigningOut(true);
    try {
      console.log('Sign out button clicked');
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      // Force redirect even if there's an error
      window.location.href = '/auth';
    } finally {
      setSigningOut(false);
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertCircle;
      case 'error': return AlertCircle;
      default: return AlertCircle;
    }
  };

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'error': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getAverageScore = (item: HistoryItem) => {
    return Math.round((item.structure_score + item.clarity_score + item.tone_score) / 3);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black relative overflow-hidden">
      {/* Cursor Glow Effect */}
      <div 
        ref={cursorGlowRef}
        className="cursor-glow"
      />

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-600/4 rounded-full blur-3xl animate-float animate-blue-pulse"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-cyan-600/5 rounded-full blur-2xl animate-float-delayed animate-blue-pulse"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-blue-700/3 rounded-full blur-3xl animate-float-slow animate-blue-pulse"></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 bg-indigo-600/4 rounded-full blur-2xl animate-float animate-blue-pulse"></div>
        <div className="absolute top-1/2 left-1/2 w-36 h-36 bg-blue-500/3 rounded-full blur-3xl animate-float-delayed animate-blue-pulse"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 backdrop-blur-xl bg-black/60 border-b border-blue-500/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/60 hover:shadow-blue-500/80 transition-all duration-300 hover:scale-110 hover:rotate-3 icon-glow-blue">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-200 to-white bg-clip-text text-transparent">
                  AI Interview Coach
                </h1>
                <p className="text-sm text-gray-400">Welcome back, {getDisplayName()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/chat"
                className="flex items-center space-x-2 text-sm text-gray-300 bg-white/5 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:glow-blue-subtle"
              >
                <MessageCircle className="w-4 h-4 text-blue-400 icon-glow-blue" />
                <span>Chat with AI Coach</span>
              </Link>
              <div className="flex items-center space-x-3 text-sm text-gray-300 bg-white/5 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-sm hover:glow-blue-subtle transition-all duration-300">
                <Clock className="w-4 h-4 text-blue-400 icon-glow-blue" />
                <span>Session: 24 min</span>
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex items-center space-x-2 text-sm text-gray-300 bg-white/5 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* History Sidebar */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 hover:glow-blue-stroke transition-all duration-500 animate-blue-stroke-pulse">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50 icon-glow-blue-stroke">
                  <History className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white">History</h2>
              </div>
              
              <div className="space-y-3">
                {history.length > 0 ? (
                  history.map((item) => (
                    <div key={item.id} className="history-item-reduced group p-4">
                      <div className="history-item-content">
                        <div className="text-sm font-medium text-gray-300 mb-2 line-clamp-2 group-hover:text-white transition-colors">
                          {item.question}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{item.created_at}</span>
                          <span className={`text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm ${
                            getAverageScore(item) >= 85 ? 'text-green-300 bg-green-500/20 border border-green-500/30' :
                            getAverageScore(item) >= 70 ? 'text-yellow-300 bg-yellow-500/20 border border-yellow-500/30' :
                            'text-red-300 bg-red-500/20 border border-red-500/30'
                          }`}>
                            {getAverageScore(item)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">No interview history yet</p>
                    <p className="text-gray-500 text-xs mt-1">Complete your first interview to see history</p>
                  </div>
                )}
              </div>
              
              <button className="w-full mt-6 text-sm text-blue-400 hover:text-blue-300 font-medium transition-all duration-300 hover:scale-105 hover:glow-blue-stroke">
                View All Sessions
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Question Generator Section */}
            <div className="glass-card p-8 hover:glow-blue transition-all duration-500">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/60 hover:shadow-purple-500/80 transition-all duration-300 hover:scale-110 icon-glow-blue">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">Generate Custom Questions</h2>
                  <p className="text-gray-400">Ask for specific types of interview questions</p>
                </div>
              </div>
              
              <div className="flex items-end space-x-4 mb-6">
                <div className="flex-1">
                  <input
                    type="text"
                    value={questionRequest}
                    onChange={(e) => setQuestionRequest(e.target.value)}
                    placeholder="e.g., '2 DSA questions' or '3 behavioral questions for leadership roles'"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500/50 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 focus:bg-white/10"
                    onKeyPress={(e) => e.key === 'Enter' && handleGenerateQuestions()}
                  />
                </div>
                <button
                  onClick={handleGenerateQuestions}
                  disabled={!questionRequest.trim() || isGenerating}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-110 active:scale-95 flex items-center space-x-3"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-5 h-5" />
                      <span>Generate</span>
                    </>
                  )}
                </button>
              </div>

              {/* Generated Questions Display */}
              {showGenerator && generatedQuestions.length > 0 && (
                <div className="glass-card-inner p-6 border-l-4 border-purple-500">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Generated Questions ({generatedQuestions.length}):
                  </h3>
                  <div className="space-y-3">
                    {generatedQuestions.map((question, index) => (
                      <div key={index} className="flex items-start justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                        <div className="flex-1 pr-4">
                          <div className="text-xs text-purple-400 mb-1">Question {index + 1}</div>
                          <p className="text-gray-200">{question}</p>
                        </div>
                        <button
                          onClick={() => handleUseGeneratedQuestion(question)}
                          className="text-sm bg-purple-500/20 text-purple-300 px-3 py-1 rounded-lg hover:bg-purple-500/30 transition-all duration-300 whitespace-nowrap"
                        >
                          Use This
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Interview Question Section */}
            <div className="glass-card p-8 hover:glow-blue transition-all duration-500">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/60 hover:shadow-blue-500/80 transition-all duration-300 hover:scale-110 icon-glow-blue">
                    <MessageSquare className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-white">Interview Question</h2>
                    <p className="text-gray-400">Practice makes perfect</p>
                  </div>
                </div>
                {questionCount > 0 && (
                  <span className="text-sm text-gray-400 bg-white/5 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm hover:glow-blue-subtle transition-all duration-300">
                    Question #{questionCount}
                  </span>
                )}
              </div>
              
              <div className="glass-card-inner p-8 mb-8 border-l-4 border-blue-500 hover:border-blue-400 transition-all duration-300 hover:glow-blue-subtle">
                {loadingQuestion ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                      <span className="text-gray-300">Loading next question...</span>
                    </div>
                  </div>
                ) : currentQuestion ? (
                  <p className="text-xl text-gray-100 leading-relaxed font-medium">
                    {currentQuestion}
                  </p>
                ) : (
                  <p className="text-xl text-gray-400 leading-relaxed font-medium text-center py-4">
                    Click "Next Question" to get started or generate custom questions above!
                  </p>
                )}
              </div>
              
              <button
                onClick={handleNextQuestion}
                disabled={loadingQuestion}
                className="btn-primary-enhanced flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingQuestion ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    <span>Next Question</span>
                  </>
                )}
              </button>
            </div>

            {/* Answer Input Section */}
            <div className="glass-card p-8 hover:glow-blue transition-all duration-500">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-green-500/60 hover:shadow-green-500/80 transition-all duration-300 hover:scale-110 icon-glow-blue">
                  <Mic className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">Your Answer</h2>
                  <p className="text-gray-400">Structure your response using STAR method</p>
                </div>
              </div>
              
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here... Aim for a detailed response that follows the STAR method (Situation, Task, Action, Result)."
                className="w-full h-48 p-6 bg-white/5 border border-white/10 rounded-2xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50 text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 focus:bg-white/10 hover:glow-blue-subtle focus:glow-blue-subtle"
              />
              
              <div className="flex items-center justify-between mt-8">
                <span className="text-sm text-gray-400 bg-white/5 px-3 py-2 rounded-lg hover:glow-blue-subtle transition-all duration-300">
                  {answer.length} characters
                </span>
                
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!answer.trim() || submitting || !currentQuestion}
                  className="btn-success-enhanced disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Submit Answer</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Feedback Section */}
            {showFeedback && (
              <div className="glass-card p-8 hover:glow-blue transition-all duration-500">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-500/60 hover:shadow-cyan-500/80 transition-all duration-300 hover:scale-110 icon-glow-blue">
                    <BarChart3 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-white">AI Feedback</h2>
                    <p className="text-gray-400">Detailed analysis of your response</p>
                  </div>
                </div>
                
                {/* Scores Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  {getFeedbackScores().map((score, index) => (
                    <div key={index} className="glass-card-inner p-6 text-center hover:glow-blue-subtle transition-all duration-300 group hover:scale-105">
                      <div className={`text-3xl font-bold ${score.color} mb-2 group-hover:scale-110 transition-transform duration-300 ${score.score === null ? 'text-gray-500' : ''}`}>
                        {score.displayScore}
                      </div>
                      <div className="text-sm text-gray-400 font-medium">
                        {score.label}
                      </div>
                      {score.score === null && (
                        <div className="text-xs text-gray-500 mt-1">
                          Not Available
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Issues - Show only middle 3 boxes */}
                {feedbackData?.issues && feedbackData.issues.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-red-400 via-orange-400 to-red-500 bg-clip-text text-transparent flex items-center space-x-3 mb-6">
                      <AlertCircle className="w-8 h-8 text-red-400 animate-pulse" />
                      <span>Detected Issues</span>
                      <AlertCircle className="w-8 h-8 text-red-400 animate-pulse" />
                    </h3>
                    <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 rounded-full mb-6"></div>
                    <div className="space-y-4">
                      {feedbackData.issues.slice(1, 4).map((issue, index) => {
                        const IconComponent = getIssueIcon(issue.type);
                        return (
                          <div key={index} className={`flex items-start space-x-4 p-6 rounded-2xl border backdrop-blur-sm hover:glow-blue-subtle transition-all duration-300 hover:scale-[1.02] ${getIssueColor(issue.type)}`}>
                            <IconComponent className="w-6 h-6 flex-shrink-0 mt-0.5" />
                            <span className="text-sm leading-relaxed">{issue.message}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Suggestions with Custom Headings */}
                {feedbackData?.suggestions && feedbackData.suggestions.length > 0 && (
                  <div className="mb-8">
                    {/* Eye-catching Improvement Heading */}
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 bg-clip-text text-transparent flex items-center space-x-3 mb-4">
                        <span>Personalized Improvements</span>
                      </h3>
                      <div className="h-1 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 rounded-full mb-6"></div>
                    </div>

                    <div className="space-y-4">
                      {feedbackData.suggestions.slice(1, -1).map((suggestion, index) => (
                        <div key={index} className="flex items-start space-x-4 p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl backdrop-blur-sm hover:glow-blue-subtle transition-all duration-300 hover:scale-[1.02]">
                          <TrendingUp className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5 icon-glow-blue" />
                          <span className="text-sm text-gray-300 leading-relaxed">{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Improved Answer Example */}
                {feedbackData?.improved_answer && (
                  <div>
                    {/* Eye-catching Improved Answer Heading */}
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent flex items-center space-x-3 mb-4">
                        <span>Improved Answer Example</span>
                      </h3>
                      <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full mb-6"></div>
                    </div>

                    {/* Improved Answer Content */}
                    <div className="glass-card-inner p-8 border-l-4 border-emerald-500 hover:border-emerald-400 transition-all duration-300 hover:glow-blue-subtle">
                      <div className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {feedbackData.improved_answer}
                      </div>
                    </div>
                  </div>
                )}

                {/* Show message if no feedback available */}
                {(!feedbackData?.issues || feedbackData.issues.length === 0) && 
                 (!feedbackData?.suggestions || feedbackData.suggestions.length === 0) &&
                 !feedbackData?.improved_answer && (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No specific feedback available at this time.</p>
                    <p className="text-gray-500 text-sm mt-2">The AI feedback system is still analyzing your response.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InterviewDashboard;