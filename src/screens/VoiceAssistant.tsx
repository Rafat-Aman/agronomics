import { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../components/Layout';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, VolumeX, Trash2, Sprout, Languages, Info } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

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

  const recognitionRef = useRef<any>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isBn = voiceLang === 'bn-BD';

  const GREETINGS = {
    'bn-BD': 'আস-সালামু আলাইকুম! আমি আপনার কৃষি এআই সহকারী। ধান, গম, সবজি বা যেকোনো চাষাবাদের বিষয়ে প্রশ্ন করুন।',
    'en-US': "Hello! I'm your AI Farming Assistant. Ask me anything about crops, soil, weather, or farming techniques.",
  };

  // ── Load voices with retries (Chrome loads them async) ───────────────────
  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices();
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
    window.speechSynthesis.onvoiceschanged = load;
    // Chrome sometimes needs a nudge
    const t1 = setTimeout(load, 200);
    const t2 = setTimeout(load, 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // ── Greeting on mount ────────────────────────────────────────────────────
  useEffect(() => {
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      text: GREETINGS[voiceLang],
      timestamp: new Date(),
    }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, transcript]);

  // ── TTS using Web Speech API ─────────────────────────────────────────────
  const speakText = useCallback((text: string, lang: 'bn-BD' | 'en-US') => {
    if (isMuted) return;
    window.speechSynthesis.cancel();

    const clean = text.replace(/[*_`#>~\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(clean);
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
      if (!window.speechSynthesis.speaking) { clearInterval(keepAlive); return; }
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 10000);
    utterance.onend = () => { setIsSpeaking(false); clearInterval(keepAlive); };
    utterance.onerror = () => { setIsSpeaking(false); clearInterval(keepAlive); };

    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // ── Send to Gemini ────────────────────────────────────────────────────────
  const sendToAI = useCallback(async (userText: string) => {
    if (!userText.trim() || isThinking) return;

    setMessages((prev) => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      text: userText.trim(),
      timestamp: new Date(),
    }]);
    setIsThinking(true);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setMessages((prev) => [...prev, {
        id: Date.now() + '-err',
        role: 'assistant',
        text: isBn ? 'API কী পাওয়া যায়নি।' : 'API key missing.',
        timestamp: new Date(),
      }]);
      setIsThinking(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const sys = isBn
        ? 'তুমি একজন অভিজ্ঞ বাংলাদেশি কৃষি বিশেষজ্ঞ। শুধুমাত্র বাংলায় উত্তর দাও। সহজ ও সংক্ষিপ্ত ভাষায় কৃষকদের উপযোগী পরামর্শ দাও। কোনো মার্কডাউন ব্যবহার করো না।'
        : 'You are an expert agricultural assistant for Bangladeshi farmers. Respond clearly in English. Be concise and practical. No markdown formatting.';

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${sys}\n\nUser: ${userText}`,
      });

      const aiText = result.text?.trim() || '...';
      setMessages((prev) => [...prev, {
        id: Date.now() + '-ai',
        role: 'assistant',
        text: aiText,
        timestamp: new Date(),
      }]);
      speakText(aiText, voiceLang);
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        id: Date.now() + '-err',
        role: 'assistant',
        text: `Error: ${err.message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsThinking(false);
    }
  }, [isThinking, isBn, voiceLang, speakText]);

  // ── Speech Recognition ────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!micSupported || isListening) return;
    stopSpeaking();
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = voiceLang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => { setIsListening(true); setTranscript(''); };
    recognition.onresult = (event: any) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t; else interim += t;
      }
      setTranscript(final || interim);
      if (final) { recognition.stop(); sendToAI(final); }
    };
    recognition.onerror = () => { setIsListening(false); setTranscript(''); };
    recognition.onend = () => { setIsListening(false); setTranscript(''); };
    recognition.start();
  }, [micSupported, isListening, voiceLang, sendToAI, stopSpeaking]);

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
    setMessages([{ id: 'g-' + Date.now(), role: 'assistant', text: GREETINGS[next], timestamp: new Date() }]);
  };

  const toggleMute = () => {
    if (!isMuted) stopSpeaking();
    setIsMuted((m) => !m);
  };

  const clearChat = () => {
    stopSpeaking();
    setMessages([{ id: 'g-' + Date.now(), role: 'assistant', text: GREETINGS[voiceLang], timestamp: new Date() }]);
  };

  const handleTextSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendToAI(textInput.trim());
    setTextInput('');
  };

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const micStatus = !micSupported
    ? (isBn ? 'মাইক্রোফোন সমর্থিত নয়' : 'Microphone not supported')
    : isListening
    ? (isBn ? 'শুনছি... থামাতে আবার চাপুন' : 'Listening... tap again to stop')
    : isSpeaking
    ? (isBn ? 'বলছি...' : 'Speaking...')
    : (isBn ? 'মাইক চেপে বাংলায় কথা বলুন' : 'Tap mic and speak in English');

  return (
    <Layout title={isBn ? 'কৃষি এআই সহকারী' : 'Agri AI Assistant'} showBack hideLangToggle>
      <div className="flex flex-col px-4" style={{ height: 'calc(100vh - 5rem)' }}>

        {/* ── Top Bar ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between py-2.5 mb-1 border-b border-outline-variant/20">
          {/* Single language toggle */}
          <button
            id="va-lang-toggle"
            onClick={toggleLang}
            className="flex items-center gap-2 bg-surface-container-high hover:bg-surface-container px-3 py-2 rounded-xl transition-all group"
          >
            <Languages className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-on-surface">{isBn ? 'বাংলা' : 'English'}</span>
            <span className="text-[10px] text-on-surface-variant bg-outline-variant/30 px-2 py-0.5 rounded-md">
              → {isBn ? 'English' : 'বাংলা'}
            </span>
          </button>

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

        {/* ── Bengali voice warning ─────────────────────────── */}
        {isBn && bnVoiceAvailable === false && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 my-1">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 leading-relaxed">
              বাংলা ভয়েস পাওয়া যায়নি। Windows Settings → Time &amp; Language → Language → বাংলা যোগ করুন।
              টেক্সট দেখা যাবে, কিন্তু শব্দ নাও শোনা যেতে পারে।
            </p>
          </div>
        )}
        {isBn && bnVoiceAvailable === true && (
          <p className="text-[10px] text-green-600 text-center py-0.5">✓ {isBn ? 'বাংলা ভয়েস সক্রিয়' : 'Bengali voice active'}</p>
        )}

        {/* ── Messages ─────────────────────────────────────── */}
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

        {/* ── Mic Button ────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="relative flex items-center justify-center w-20 h-20">
            {isListening && [1, 2, 3].map((r) => (
              <motion.div key={r} className="absolute rounded-full border-2 border-error/40"
                animate={{ width: [80, 80 + r * 30], height: [80, 80 + r * 30], opacity: [0.7, 0] }}
                transition={{ repeat: Infinity, duration: 1.6, delay: r * 0.25, ease: 'easeOut' }} />
            ))}
            {isSpeaking && [1, 2].map((r) => (
              <motion.div key={'sp' + r} className="absolute rounded-full border-2 border-secondary/40"
                animate={{ width: [80, 80 + r * 26], height: [80, 80 + r * 26], opacity: [0.6, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: r * 0.2, ease: 'easeOut' }} />
            ))}
            <motion.button
              id="va-mic-button"
              onClick={isListening ? stopListening : startListening}
              disabled={!micSupported}
              whileTap={{ scale: 0.9 }}
              animate={isListening ? { scale: [1, 1.05, 1] } : {}}
              transition={isListening ? { repeat: Infinity, duration: 1.2 } : {}}
              className={`w-[72px] h-[72px] rounded-full z-10 flex items-center justify-center shadow-2xl transition-colors ${
                isListening ? 'bg-error text-white'
                : isSpeaking ? 'bg-secondary text-white'
                : 'bg-primary text-white hover:brightness-110'
              } ${!micSupported ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </motion.button>
          </div>
          <p className="text-xs font-semibold text-on-surface-variant text-center">{micStatus}</p>
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
    </Layout>
  );
}
