import { useState, useEffect, useRef, useCallback } from 'react';
import type { FormEvent } from 'react';
import Layout from '../components/Layout';
import Anthropic from '@anthropic-ai/sdk';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, VolumeX, Trash2, Sprout, Languages, Info, Menu, X, MessageSquare, PlusCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { 
  saveVoiceChatMessage, 
  subscribeToSessionMessages, 
  createVoiceChatSession, 
  subscribeToVoiceSessions,
  deleteVoiceChatSession,
  VoiceChatSession
} from '../lib/db';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

const getMicPermissionError = (isBn: boolean): string => {
  const isAndroid = /android/i.test(navigator.userAgent);
  const isInsecure = typeof window !== 'undefined' && !window.isSecureContext;

  if (isInsecure) {
    return isBn
      ? 'মাইক্রোফোন ব্যবহার করতে HTTPS সংযোগ প্রয়োজন। সাইট অ্যাডমিনের সাথে যোগাযোগ করুন।'
      : 'Microphone requires a secure (HTTPS) connection. Please contact the site admin.';
  }
  if (isAndroid) {
    return isBn
      ? 'মাইক্রোফোন ব্যবহারের অনুমতি নেই। Chrome-এর Settings > Site Settings > Microphone থেকে Allow করুন, তারপর আবার চেষ্টা করুন।'
      : 'Microphone permission blocked. Go to Chrome Settings > Site Settings > Microphone and allow access, then try again.';
  }
  return isBn
    ? 'মাইক্রোফোন ব্যবহারের অনুমতি নেই। ব্রাউজারের অ্যাড্রেস বার বা Settings থেকে Microphone permission Allow করুন, তারপর আবার চেষ্টা করুন।'
    : 'Microphone permission blocked. Allow it from your browser address bar or Settings, then try again.';
};

const hasSpeechSynthesis = () =>
  typeof window !== 'undefined' &&
  !!window.speechSynthesis &&
  typeof window.speechSynthesis.getVoices === 'function' &&
  typeof window.SpeechSynthesisUtterance === 'function';

export default function VoiceAssistant() {
  const [voiceLang, setVoiceLang] = useState<'bn-BD' | 'en-US'>('bn-BD');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [bnVoiceAvailable, setBnVoiceAvailable] = useState<boolean | null>(null);
  const [micSupported] = useState(() => !!SpeechRecognitionAPI);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<VoiceChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const { userProfile } = useAuth();
  const userId = userProfile?.uid;

  const recognitionRef = useRef<any>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendToAIRef = useRef<any>(null);
  const isThinkingRef = useRef(false);

  const isBn = voiceLang === 'bn-BD';

  const GREETINGS = {
    'bn-BD': 'আস-সালামু আলাইকুম! আমি আপনার কৃষি এআই সহকারী। ধান, গম, সবজি বা যেকোনো চাষাবাদের বিষয়ে প্রশ্ন করুন।',
    'en-US': "Hello! I'm your AI Farming Assistant. Ask me anything about crops, soil, weather, or farming techniques.",
  };

  // ── Load voices with retries (Chrome loads them async) ───────────────────
  useEffect(() => {
    if (!hasSpeechSynthesis()) {
      setBnVoiceAvailable(false);
      return;
    }

    const synth = window.speechSynthesis;
    const load = () => {
      const v = synth.getVoices();
      if (v.length > 0) {
        voicesRef.current = v;
        const hasBn = v.some(
          (x) =>
            x.lang.startsWith('bn') ||
            x.name.toLowerCase().includes('bangla') ||
            x.name.toLowerCase().includes('bengali')
        );
        setBnVoiceAvailable(hasBn);
      }
    };
    load();
    synth.onvoiceschanged = load;
    // Chrome sometimes needs a nudge
    const t1 = setTimeout(load, 200);
    const t2 = setTimeout(load, 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      synth.onvoiceschanged = null;
    };
  }, []);

  // ── Sync Sessions ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToVoiceSessions(userId, (dbSessions) => {
      setSessions(dbSessions);
    });
    return () => unsubscribe();
  }, [userId]);

  // ── Sync Messages for Current Session ───────────────────────────────────
  useEffect(() => {
    // 1. Initial State: If no session, show greeting immediately
    if (!userId || !currentSessionId) {
      setMessages([{
        id: 'greeting',
        role: 'assistant',
        text: GREETINGS[voiceLang],
        timestamp: new Date(),
      }]);
      return;
    }

    // 2. Load Session Messages
    const unsubscribe = subscribeToSessionMessages(userId, currentSessionId, (dbMessages) => {
      // Avoid flicker: if dbMessages is empty, we don't immediately revert to greeting 
      // if we are currently thinking (as that means a message was just sent)
      if (dbMessages.length > 0) {
        const mapped = dbMessages.map(m => ({
          ...m,
          timestamp: m.timestamp?.toDate ? m.timestamp.toDate() : (m.timestamp ? new Date(m.timestamp) : new Date())
        }));
        setMessages(mapped);
      } else if (!isThinkingRef.current) {
        // Only show greeting if there are truly no messages and we aren't waiting for AI
        setMessages([{
          id: 'greeting',
          role: 'assistant',
          text: GREETINGS[voiceLang],
          timestamp: new Date(),
        }]);
      }
    });

    return () => unsubscribe();
  }, [userId, currentSessionId]); // Removed voiceLang and isThinking to prevent churn

  // ── Auto scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, transcript]);

  // ── TTS using Web Speech API ─────────────────────────────────────────────
  const speakText = useCallback((text: string, lang: 'bn-BD' | 'en-US') => {
    if (isMuted || !hasSpeechSynthesis()) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    const clean = text.replace(/[*_`#>~\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    const utterance = new window.SpeechSynthesisUtterance(clean);
    utterance.lang = lang;
    utterance.rate = lang === 'bn-BD' ? 0.88 : 0.95;
    utterance.pitch = 1.0;

    // Find best matching voice
    const voices = voicesRef.current;
    let voice: SpeechSynthesisVoice | undefined;
    if (lang === 'bn-BD') {
      voice =
        voices.find((v) => v.lang === 'bn-BD') ||
        voices.find((v) => v.lang === 'bn-IN') ||
        voices.find((v) => v.lang.startsWith('bn')) ||
        voices.find((v) => v.name.toLowerCase().includes('bangla')) ||
        voices.find((v) => v.name.toLowerCase().includes('bengali'));
    } else {
      voice =
        voices.find((v) => v.lang === 'en-US' && v.name.includes('Google')) ||
        voices.find((v) => v.lang === 'en-US') ||
        voices.find((v) => v.lang.startsWith('en'));
    }
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    // Workaround: Chrome pauses long utterances — keepalive workaround
    const keepAlive = setInterval(() => {
      if (!synth.speaking) { clearInterval(keepAlive); return; }
      synth.pause();
      synth.resume();
    }, 10000);
    utterance.onend = () => { setIsSpeaking(false); clearInterval(keepAlive); };
    utterance.onerror = () => { setIsSpeaking(false); clearInterval(keepAlive); };

    synth.speak(utterance);
  }, [isMuted]);

  const stopSpeaking = useCallback(() => {
    if (hasSpeechSynthesis()) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // ── Sync sendToAI ref to avoid stale closures in listeners ────────────────
  const sendToAI = useCallback(async (userText: string) => {
    if (!userText.trim() || isThinking) return;

    setIsThinking(true);
    isThinkingRef.current = true;
    
    if (!userId) {
      setMessages(prev => [...prev, {
        id: 'auth-err-' + Date.now(),
        role: 'assistant',
        text: isBn ? 'দয়া করে লগইন করুন। ' : 'Please login to use the assistant.',
        timestamp: new Date()
      }]);
      setIsThinking(false);
      isThinkingRef.current = false;
      return;
    }

    let sessionId = currentSessionId;
    
    // Create session on first message if none exists
    if (!sessionId) {
      const title = userText.trim().slice(0, 30) + (userText.length > 30 ? '...' : '');
      try {
        sessionId = await createVoiceChatSession(userId, title);
        setCurrentSessionId(sessionId);
      } catch (err) {
        console.error("Failed to create session:", err);
        setIsThinking(false);
        isThinkingRef.current = false;
        return;
      }
    }

    try {
      await saveVoiceChatMessage(userId, sessionId, 'user', userText.trim());
    } catch (err) {
      console.error("Failed to save user message:", err);
    }

    console.log("[VoiceAssistant] Starting AI request for:", userText);

    // ── Prime speech synthesis SYNCHRONOUSLY before any await ──────────────
    // Chrome drops the user-gesture context after the first await, so we must
    // activate the synthesizer here (while still in the gesture call stack).
    if (!isMuted && hasSpeechSynthesis()) {
      const synth = window.speechSynthesis;
      synth.cancel();
      const primer = new window.SpeechSynthesisUtterance('');
      primer.volume = 0;
      synth.speak(primer);
    }

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("[VoiceAssistant] Anthropic API key is missing from .env");
      setMessages((prev) => [...prev, {
        id: Date.now() + '-err',
        role: 'assistant',
        text: isBn ? 'API কী পাওয়া যায়নি।' : 'API key missing.',
        timestamp: new Date(),
      }]);
      setIsThinking(false);
      isThinkingRef.current = false;
      return;
    }

    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

      const sys = isBn
        ? 'You are a helpful farming assistant. Respond ONLY in Bangla. Be very brief.'
        : 'You are a helpful farming assistant. Respond ONLY in English. Be very brief.';

      console.log("[VoiceAssistant] Calling Claude model...");
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: `${sys}\n\nUser: ${userText}` }],
      });

      console.log("[VoiceAssistant] Received response from Claude.");
      const aiText = (response.content[0].type === 'text' ? response.content[0].text : '').trim() || '...';
      
      if (sessionId) {
        console.log("[VoiceAssistant] Saving AI response to session:", sessionId);
        await saveVoiceChatMessage(userId, sessionId, 'assistant', aiText);
      }
      speakText(aiText, voiceLang);
    } catch (err: any) {
      console.error("[VoiceAssistant] AI Request Failed:", err);
      let errorMessage = `Error: ${err.message}`;
      
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
        errorMessage = isBn 
          ? 'দুঃখিত, অনুরোধের মাত্রা অতিক্রম করেছে। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।'
          : 'Quota exceeded. Please wait a moment before trying again.';
      }

      setMessages((prev) => [...prev, {
        id: Date.now() + '-err',
        role: 'assistant',
        text: errorMessage,
        timestamp: new Date(),
      }]);
    } finally {
      setIsThinking(false);
      isThinkingRef.current = false;
      console.log("[VoiceAssistant] Request finished.");
    }
  }, [isThinking, isBn, isMuted, voiceLang, speakText, userId, currentSessionId]);

  useEffect(() => {
    sendToAIRef.current = sendToAI;
  }, [sendToAI]);


  // ── Speech Recognition ────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (!micSupported || isListening) return;
    stopSpeaking();

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.error("Microphone permission check failed:", err);
        setMessages(prev => [...prev, {
          id: 'mic-permission-' + Date.now(),
          role: 'assistant',
          text: getMicPermissionError(isBn),
          timestamp: new Date()
        }]);
        return;
      }
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = voiceLang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => { 
      setIsListening(true); 
      setTranscript(''); 
    };
    recognition.onresult = (event: any) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t; else interim += t;
      }
      setTranscript(final || interim);
      if (final && sendToAIRef.current) { 
        recognition.stop(); 
        sendToAIRef.current(final); 
      }
    };
    recognition.onerror = (e: any) => { 
      console.error("Speech Recognition Error:", e.error);
      setIsListening(false); 
      setTranscript(''); 
      
      if (e.error === 'not-allowed') {
        setMessages(prev => [...prev, {
          id: 'mic-err-' + Date.now(),
          role: 'assistant',
          text: getMicPermissionError(isBn),
          timestamp: new Date()
        }]);
      }
    };
    recognition.onend = () => { setIsListening(false); setTranscript(''); };
    recognition.start();
  }, [micSupported, isListening, voiceLang, stopSpeaking, isBn]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setTranscript('');
  }, []);

  // ── Language Toggle ───────────────────────────────────────────────────────
  const toggleLang = () => {
    stopSpeaking();
    stopListening();
    const next: 'bn-BD' | 'en-US' = voiceLang === 'bn-BD' ? 'en-US' : 'bn-BD';
    setVoiceLang(next);
    // Note: useEffect at line 93 will handle the message reset automatically
  };

  const toggleMute = () => {
    if (!isMuted) stopSpeaking();
    setIsMuted((m) => !m);
  };

  const clearChat = () => {
    stopSpeaking();
    if (userId && currentSessionId) {
      deleteVoiceChatSession(userId, currentSessionId);
      setCurrentSessionId(null);
    } else {
      setMessages([{ id: 'g-' + Date.now(), role: 'assistant', text: GREETINGS[voiceLang], timestamp: new Date() }]);
    }
  };

  const startNewChat = () => {
    stopSpeaking();
    setCurrentSessionId(null);
    setIsSidebarOpen(false);
  };

  const selectSession = (sid: string) => {
    stopSpeaking();
    setCurrentSessionId(sid);
    setIsSidebarOpen(false);
  };

  const handleTextSend = (e: FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendToAI(textInput.trim());
    setTextInput('');
  };

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Layout title={isBn ? 'কৃষি এআই সহকারী' : 'Agri AI Assistant'} showBack hideLangToggle>
      <div className="flex relative overflow-hidden" style={{ height: 'calc(100vh - 5rem)' }}>
        
        {/* ── Sidebar ────────────────────────────────────────── */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="absolute inset-0 bg-black/40 z-40 backdrop-blur-sm sm:hidden"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute left-0 top-0 bottom-0 w-72 bg-surface-container-high z-50 shadow-2xl border-r border-outline-variant/20 flex flex-col"
              >
                <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between">
                  <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    {isBn ? 'চ্যাট ইতিহাস' : 'Chat History'}
                  </h3>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-surface-container rounded-lg">
                    <X className="w-5 h-5 text-on-surface-variant" />
                  </button>
                </div>

                <div className="p-3">
                  <button
                    onClick={startNewChat}
                    className="w-full flex items-center gap-3 bg-primary text-white p-3 rounded-2xl font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    <PlusCircle className="w-5 h-5" />
                    {isBn ? 'নতুন চ্যাট শুরু করুন' : 'Start New Chat'}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                      <p className="text-xs text-on-surface-variant font-medium">
                        {isBn ? 'কোনো পূর্ববর্তী চ্যাট নেই' : 'No previous chats found'}
                      </p>
                    </div>
                  ) : (
                    sessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => selectSession(s.id)}
                        className={`w-full text-left p-4 rounded-2xl transition-all border ${
                          currentSessionId === s.id
                            ? 'bg-primary/10 border-primary shadow-sm'
                            : 'bg-surface hover:bg-surface-container-low border-transparent'
                        }`}
                      >
                        <p className="font-bold text-sm text-on-surface truncate">{s.title || (isBn ? 'নতুন আলাপ' : 'New Chat')}</p>
                        <p className="text-[10px] text-on-surface-variant line-clamp-1 mt-0.5">{s.lastMessage || '...'}</p>
                        <p className="text-[9px] text-on-surface-variant/40 mt-1">
                          {s.updatedAt?.toDate ? s.updatedAt.toDate().toLocaleDateString() : 'Just now'}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col px-4">

          {/* ── Top Bar ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between py-2.5 mb-1 border-b border-outline-variant/20">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="w-10 h-10 flex items-center justify-center bg-surface-container-high rounded-xl text-primary shadow-sm hover:bg-surface-container transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <button
                id="va-lang-toggle"
                onClick={toggleLang}
                className="flex items-center gap-2 bg-surface-container-high hover:bg-surface-container px-3 py-2 rounded-xl transition-all group"
              >
                <Languages className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-on-surface">{isBn ? 'বাংলা' : 'English'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isMuted ? 'bg-error/10 text-error' : 'bg-surface-container-high text-on-surface-variant hover:text-primary'}`}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                onClick={clearChat}
                className="w-9 h-9 rounded-xl bg-surface-container-high text-on-surface-variant hover:text-error flex items-center justify-center transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Messages Area ─────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 shrink-0 rounded-full bg-primary flex items-center justify-center mt-auto">
                      <Sprout className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[78%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-2xl rounded-br-sm shadow-sm'
                        : 'bg-surface-container-high text-on-surface rounded-2xl rounded-bl-sm shadow-sm'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-on-surface-variant/40 px-1">{formatTime(msg.timestamp)}</span>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 shrink-0 rounded-full bg-secondary flex items-center justify-center mt-auto text-xs font-black text-white">
                      {isBn ? 'আ' : 'U'}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Thinking dots */}
            <AnimatePresence>
              {isThinking && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2.5 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Sprout className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-surface-container-high px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2 shadow-sm">
                    {[0, 1, 2].map((i) => (
                      <motion.span key={i} className="w-2 h-2 bg-primary/60 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.75, delay: i * 0.15 }} />
                    ))}
                    <span className="text-xs text-on-surface-variant ml-1">{isBn ? 'চিন্তা করছি...' : 'Thinking...'}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live transcript */}
            <AnimatePresence>
              {isListening && transcript && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-end">
                  <div className="bg-primary/15 text-primary px-4 py-2 rounded-2xl rounded-br-sm text-sm italic max-w-[78%]">
                    {transcript}…
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          {/* ── Footer / Mic Area ─────────────────────────────── */}
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
              {isListening && [1, 2, 3].map((r) => (
                <motion.div key={r} className="absolute rounded-full border-2 border-error/40"
                  animate={{ width: [60, 60 + r * 30], height: [60, 60 + r * 30], opacity: [0.7, 0] }}
                  transition={{ repeat: Infinity, duration: 1.6, delay: r * 0.25, ease: 'easeOut' }} />
              ))}
              <motion.button
                id="va-mic-button"
                onClick={isListening ? stopListening : startListening}
                disabled={!micSupported}
                whileTap={{ scale: 0.9 }}
                className={`w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-full z-10 flex items-center justify-center shadow-2xl transition-colors ${
                  isListening ? 'bg-error text-white' : isSpeaking ? 'bg-secondary text-white' : 'bg-primary text-white hover:brightness-110'
                } ${!micSupported ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isListening ? <MicOff className="w-6 h-6 sm:w-7 sm:h-7" /> : <Mic className="w-6 h-6 sm:w-7 sm:h-7" />}
              </motion.button>
            </div>
            <p className="text-xs font-semibold text-on-surface-variant text-center">
              {!micSupported
                ? (isBn ? 'মাইক্রোফোন সমর্থিত নয়' : 'Microphone not supported')
                : isListening
                ? (isBn ? 'শুনছি... থামাতে আবার চাপুন' : 'Listening... tap again to stop')
                : isSpeaking
                ? (isBn ? 'বলছি...' : 'Speaking...')
                : (isBn ? 'মাইক চেপে বাংলায় কথা বলুন' : 'Tap mic and speak in English')}
            </p>
          </div>

        {/* ── Text Input ─────────────────────────────────────── */}
        <form onSubmit={handleTextSend} className="flex gap-2 pb-3">
          <input
            id="va-text-input"
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={isBn ? 'প্রশ্ন লিখুন...' : 'Type your question...'}
            className="flex-1 bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
          <button
            type="submit"
            id="va-send-btn"
            disabled={!textInput.trim() || isThinking}
            className="bg-primary text-white px-5 py-3 rounded-2xl text-sm font-bold hover:brightness-105 disabled:opacity-40 active:scale-95 transition-all"
          >
            {isBn ? 'পাঠান' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  </Layout>
  );
}
