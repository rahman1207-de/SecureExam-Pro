/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  User, 
  ClipboardCheck, 
  Upload, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  BarChart3,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type View = 'landing' | 'examiner' | 'student-entry' | 'exam' | 'result';

interface Question {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

interface Result {
  id: number;
  student_name: string;
  score: number;
  total_questions: number;
  timestamp: string;
  status: string;
}

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [studentName, setStudentName] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [examResult, setExamResult] = useState<{ score: number; total: number } | null>(null);
  const [allResults, setAllResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isTerminated, setIsTerminated] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Security listeners
  useEffect(() => {
    if (view === 'exam') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          terminateExam('Tab switching detected. Exam terminated.');
        }
      };

      const handleBlur = () => {
        terminateExam('Window focus lost. Exam terminated.');
      };

      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };

      window.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleBlur);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [view]);

  // Timer logic
  useEffect(() => {
    if (view === 'exam' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            submitExam('timeout');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [view, timeLeft]);

  const terminateExam = (reason: string) => {
    if (view !== 'exam' || isTerminated) return;
    setIsTerminated(true);
    submitExam('terminated');
    setError(reason);
  };

  const startExam = async () => {
    if (!studentName.trim()) {
      setError('Please enter your name');
      return;
    }
    try {
      const res = await fetch('/api/questions');
      const data = await res.json();
      if (data.length === 0) {
        setError('No questions available. Please contact the examiner.');
        return;
      }
      setQuestions(data);
      setAnswers({});
      setTimeLeft(600);
      setIsTerminated(false);
      setError(null);
      setView('exam');
    } catch (err) {
      setError('Failed to load questions');
    }
  };

  const submitExam = async (status: 'completed' | 'terminated' | 'timeout' = 'completed') => {
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName, answers, status }),
      });
      const data = await res.json();
      setExamResult(data);
      setView('result');
    } catch (err) {
      setError('Failed to submit exam');
    }
  };

  const fetchResults = async () => {
    try {
      const res = await fetch('/api/results');
      const data = await res.json();
      setAllResults(data);
    } catch (err) {
      setError('Failed to fetch results');
    }
  };

  const uploadQuestions = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawData = formData.get('questionsData') as string;
    
    try {
      const parsed = JSON.parse(rawData);
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: parsed }),
      });
      if (res.ok) {
        alert('Questions uploaded successfully');
        e.currentTarget.reset();
      }
    } catch (err) {
      alert('Invalid JSON format. Please check your input.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#F5F5F0]">
      {/* Header */}
      <header className="border-b border-[#141414]/10 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('landing')}>
            <Shield className="w-6 h-6" />
            <span className="font-bold tracking-tight text-lg">SecureExam Pro</span>
          </div>
          {view !== 'landing' && view !== 'exam' && (
            <button 
              onClick={() => setView('landing')}
              className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity"
            >
              <LogOut className="w-4 h-4" />
              Exit
            </button>
          )}
          {view === 'exam' && (
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${timeLeft < 60 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-[#141414]/10'}`}>
                <Clock className="w-4 h-4" />
                <span className="font-mono font-medium">{formatTime(timeLeft)}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid md:grid-cols-2 gap-12 items-center py-12"
            >
              <div>
                <h1 className="text-6xl font-bold leading-[0.9] tracking-tighter mb-6">
                  THE FUTURE OF <br />
                  <span className="italic font-serif font-light">SECURE</span> TESTING.
                </h1>
                <p className="text-lg text-[#141414]/60 mb-8 max-w-md">
                  A professional examination platform built for integrity. Anti-cheat monitoring, automated grading, and instant results.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={() => setView('student-entry')}
                    className="px-8 py-4 bg-[#141414] text-[#F5F5F0] rounded-full font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <User className="w-5 h-5" />
                    Student Portal
                  </button>
                  <button 
                    onClick={() => { setView('examiner'); fetchResults(); }}
                    className="px-8 py-4 border border-[#141414] rounded-full font-bold flex items-center justify-center gap-2 hover:bg-[#141414] hover:text-[#F5F5F0] transition-all"
                  >
                    <ClipboardCheck className="w-5 h-5" />
                    Examiner Dashboard
                  </button>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square bg-[#141414] rounded-3xl overflow-hidden rotate-3 flex items-center justify-center p-12">
                  <Shield className="w-full h-full text-[#F5F5F0]/10" />
                  <div className="absolute inset-0 flex flex-col justify-center items-center text-[#F5F5F0] p-8">
                    <div className="text-4xl font-serif italic mb-2">Integrity First</div>
                    <div className="text-sm uppercase tracking-widest opacity-50">Powered by SecureExam Pro</div>
                  </div>
                </div>
                <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-[#141414]/5 max-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">Active Monitoring</span>
                  </div>
                  <p className="text-xs font-medium">Anti-cheat systems are active and ready.</p>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'examiner' && (
            <motion.div 
              key="examiner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-4xl font-bold tracking-tight">Examiner Dashboard</h2>
                  <p className="text-[#141414]/60">Manage questions and monitor student performance.</p>
                </div>
                <BarChart3 className="w-12 h-12 opacity-10" />
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {/* Upload Section */}
                <div className="md:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-[#141414]/10 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-[#141414] text-white rounded-xl">
                        <Upload className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold">Upload Exam</h3>
                    </div>
                    <form onSubmit={uploadQuestions} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider opacity-50 block mb-2">Questions JSON</label>
                        <textarea 
                          name="questionsData"
                          className="w-full h-64 p-4 bg-[#F5F5F0] rounded-2xl border border-[#141414]/10 font-mono text-xs focus:ring-2 ring-[#141414]/5 outline-none resize-none"
                          placeholder='[{"question": "What is 2+2?", "option_a": "3", "option_b": "4", "option_c": "5", "option_d": "6", "correct_answer": "b"}]'
                          required
                        />
                      </div>
                      <button className="w-full py-3 bg-[#141414] text-white rounded-full font-bold hover:opacity-90 transition-opacity">
                        Update Exam Data
                      </button>
                    </form>
                  </div>
                </div>

                {/* Results Section */}
                <div className="md:col-span-2">
                  <div className="bg-white rounded-3xl border border-[#141414]/10 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-[#141414]/5 flex items-center justify-between">
                      <h3 className="font-bold">Recent Submissions</h3>
                      <button onClick={fetchResults} className="text-xs font-bold uppercase tracking-wider hover:underline">Refresh</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-[#F5F5F0]/50 text-[10px] font-bold uppercase tracking-wider">
                            <th className="px-6 py-4">Student</th>
                            <th className="px-6 py-4">Score</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#141414]/5">
                          {allResults.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-[#141414]/40 italic">No results found yet.</td>
                            </tr>
                          ) : (
                            allResults.map((r) => (
                              <tr key={r.id} className="hover:bg-[#F5F5F0]/30 transition-colors">
                                <td className="px-6 py-4 font-medium">{r.student_name}</td>
                                <td className="px-6 py-4">
                                  <span className="font-bold">{r.score}</span>
                                  <span className="text-[#141414]/40"> / {r.total_questions}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    r.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                                    r.status === 'terminated' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {r.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-[#141414]/60">
                                  {new Date(r.timestamp).toLocaleString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'student-entry' && (
            <motion.div 
              key="student-entry"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto py-12"
            >
              <div className="bg-white p-8 rounded-3xl border border-[#141414]/10 shadow-xl text-center">
                <div className="w-16 h-16 bg-[#141414] text-white rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <User className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold mb-2">Student Login</h2>
                <p className="text-[#141414]/60 mb-8">Enter your full name to begin the examination.</p>
                
                <div className="space-y-4">
                  <div className="text-left">
                    <label className="text-[10px] font-bold uppercase tracking-wider opacity-50 block mb-2 px-2">Full Name</label>
                    <input 
                      type="text" 
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full px-6 py-4 bg-[#F5F5F0] rounded-2xl border border-[#141414]/10 focus:ring-2 ring-[#141414]/5 outline-none font-medium"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  
                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <div className="p-4 bg-amber-50 text-amber-700 rounded-2xl text-xs text-left">
                    <p className="font-bold mb-1 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> SECURITY WARNING
                    </p>
                    Switching tabs, refreshing, or leaving the window will result in immediate termination of your exam.
                  </div>

                  <button 
                    onClick={startExam}
                    className="w-full py-4 bg-[#141414] text-white rounded-full font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    Start Examination
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'exam' && (
            <motion.div 
              key="exam"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="bg-[#141414] text-[#F5F5F0] p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Candidate</div>
                  <div className="text-2xl font-serif italic">{studentName}</div>
                </div>
                <div className="flex gap-8">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Questions</div>
                    <div className="text-xl font-bold">{Object.keys(answers).length} / {questions.length}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Time Remaining</div>
                    <div className={`text-xl font-mono font-bold ${timeLeft < 60 ? 'text-red-400' : ''}`}>{formatTime(timeLeft)}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={q.id} className="bg-white p-8 rounded-3xl border border-[#141414]/10 shadow-sm">
                    <div className="flex gap-4 mb-6">
                      <span className="text-4xl font-serif italic opacity-10">0{idx + 1}</span>
                      <h3 className="text-xl font-bold pt-2">{q.question}</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {['a', 'b', 'c', 'd'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-4 ${
                            answers[q.id] === opt 
                              ? 'bg-[#141414] text-white border-[#141414]' 
                              : 'bg-[#F5F5F0] border-transparent hover:border-[#141414]/20'
                          }`}
                        >
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${
                            answers[q.id] === opt ? 'bg-white/20' : 'bg-[#141414]/5'
                          }`}>
                            {opt}
                          </span>
                          <span className="font-medium">{(q as any)[`option_${opt}`]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center py-12">
                <button 
                  onClick={() => submitExam('completed')}
                  className="px-12 py-5 bg-[#141414] text-white rounded-full font-bold text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all"
                >
                  Submit Final Answers
                </button>
              </div>
            </motion.div>
          )}

          {view === 'result' && examResult && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto py-12 text-center"
            >
              <div className="bg-white p-12 rounded-[3rem] border border-[#141414]/10 shadow-2xl relative overflow-hidden">
                {isTerminated && (
                  <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
                )}
                
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 ${isTerminated ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {isTerminated ? <XCircle className="w-12 h-12" /> : <CheckCircle className="w-12 h-12" />}
                </div>

                <h2 className="text-4xl font-bold mb-2">
                  {isTerminated ? 'Exam Terminated' : 'Exam Completed'}
                </h2>
                <p className="text-[#141414]/60 mb-12">
                  {isTerminated 
                    ? 'Your session was ended due to a security violation.' 
                    : 'Your responses have been recorded and graded.'}
                </p>

                <div className="grid grid-cols-2 gap-8 mb-12">
                  <div className="p-6 bg-[#F5F5F0] rounded-3xl">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">Your Score</div>
                    <div className="text-5xl font-bold">{examResult.score}</div>
                  </div>
                  <div className="p-6 bg-[#F5F5F0] rounded-3xl">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">Total Marks</div>
                    <div className="text-5xl font-bold">{examResult.total}</div>
                  </div>
                </div>

                {error && (
                  <div className="mb-12 p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-medium">
                    Reason: {error}
                  </div>
                )}

                <div className="space-y-4">
                  <p className="text-sm text-[#141414]/40 italic">Results have been sent to the examiner.</p>
                  <button 
                    onClick={() => setView('landing')}
                    className="px-8 py-4 border border-[#141414] rounded-full font-bold hover:bg-[#141414] hover:text-white transition-all"
                  >
                    Return to Home
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-[#141414]/5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-30">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest uppercase">SecureExam Pro v1.0</span>
          </div>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest opacity-30">
            <a href="#" className="hover:opacity-100">Privacy Policy</a>
            <a href="#" className="hover:opacity-100">Terms of Service</a>
            <a href="#" className="hover:opacity-100">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
