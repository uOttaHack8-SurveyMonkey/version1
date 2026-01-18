'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from './ChatterMonkey.module.css';

const ELEVEN_API_KEY = process.env.NEXT_PUBLIC_ELEVEN_API_KEY;
const VOICE_ID = "cDPnVvi9OUoTtLoEBZkr";

export default function ChatterMonkey() {
  const [callStatus, setCallStatus] = useState('start'); // Start with begin button
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  const [showButtons, setShowButtons] = useState(false);
  const [rating, setRating] = useState(0);
  const [hasPlayedDisclaimer, setHasPlayedDisclaimer] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  const disclaimerText =
    "Hi, This is Chatter Monkey, Speaking on behalf of Caffeine Cafe, Would you like to share your experiance today?";

  //const greetingText = "Hey, how's it going?";

  const handleBegin = () => {
    setCallStatus('disclaimer');
  };

  const handleAnswer = () => {
    setCallStatus('active');
    setShowButtons(false);
    //speakText(greetingText);
  };

  const handleDecline = () => {
    setCallStatus('rating');
    setShowButtons(false);
  };

  const handleRating = (stars) => {
    setRating(stars);
    console.log('User rated:', stars, 'stars');
  };

  const speakWithElevenLabs = async (text, onComplete) => {
    // Guard against SSR
    if (typeof window === 'undefined') {
      console.log('Skipping audio in SSR');
      return;
    }

    try {
      console.log('Using Voice ID:', VOICE_ID);
      console.log('API Key exists:', !!ELEVEN_API_KEY);
      
      setIsSpeaking(true);
      setIsListening(false);
      setSubtitle('');

      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
        { text },
        {
          responseType: "arraybuffer",
          headers: {
            "xi-api-key": ELEVEN_API_KEY,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
        }
      );

      console.log('Audio received successfully');

      const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      // Animate subtitles word by word
      const words = text.split(' ').filter(word => word.length > 0);
      let currentIndex = 0;
      let subtitleInterval = null;
      
      audio.play();

      // Calculate timing based on audio duration
      audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration * 1000;
        const timePerWord = duration / words.length;

        subtitleInterval = setInterval(() => {
          if (currentIndex >= words.length) {
            clearInterval(subtitleInterval);
            return;
          }
          
          const word = words[currentIndex];
          if (word !== undefined) {
            setSubtitle(prev => {
              return prev ? prev + ' ' + word : word;
            });
          }
          currentIndex++;
        }, timePerWord);
      });

      return new Promise((resolve) => {
        audio.onended = () => {
          if (subtitleInterval !== null) {
            clearInterval(subtitleInterval);
          }
          setIsSpeaking(false);
          setSubtitle('');
          
          setTimeout(() => {
            setIsListening(true);
            startListening(); //activate mic
            if (onComplete) {
              onComplete();
            }
          }, 500);
          
          resolve();
        };
      });
    } catch (error) {
      console.error("Error generating speech:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      setIsSpeaking(false);
      setIsListening(true);
      setSubtitle('');
    }
  };

  const speakText = (text, onComplete) => {
    speakWithElevenLabs(text, onComplete);
  };

  const recognitionRef = useRef(null);

  // VÍ DỤ: Dùng Web Speech API để nghe (Cơ bản)
  const startListening = () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
          alert("Trình duyệt không hỗ trợ nhận diện giọng nói");
          return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US'; // Hoặc 'vi-VN' tùy mục tiêu

      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        console.log("🎤 Mic active");
        setIsListening(true);
      };

      recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          console.log("User said:", transcript);
          setIsListening(false);
          handleUserResponse(transcript);
      };
      recognition.onerror = (event) => {
          if (event.error === 'aborted') return;

          console.error("Speech error:", event.error);
          setIsListening(false);
      }
      recognition.onend = () => {
        if (isListening) setIsListening(false);
          console.log("🎤 Mic stop");
      }
      recognitionRef.current = recognition;
      recognition.start();
  };
  const handleUserResponse = async (userText) => {
    setIsListening(false); // Ngừng nghe
     try {
      const res = await axios.post('/api/chat', { 
        message: userText,
        history: chatHistory
      });
      const aiResponse = res.data.text;
      console.log("AI response:", aiResponse);
      // Cập nhật lịch sử chat nếu cần
      setChatHistory(prev => [...prev, { role: 'user', content: userText }, { role: 'ai', content: aiResponse }]);
      // Nói phản hồi của AI
      //end call 
      // Kiểm tra xem AI có nói từ khóa tạm biệt không
      const lowerResponse = aiResponse.toLowerCase();
      const isCallEnded = lowerResponse.includes("goodbye") || 
                          lowerResponse.includes("have a nice day") || 
                          lowerResponse.includes("bye");

      console.log("AI Response:", aiResponse);
      console.log("Is Call Ended?", isCallEnded);

      speakText(aiResponse, () => {
        if (isCallEnded) {
          // TRƯỜNG HỢP 1: Kết thúc cuộc gọi -> Chuyển sang màn hình Rating
          console.log("Ending call...");
          setCallStatus('rating');
          setShowButtons(false);
          //api analyze call here
          axios.post('/api/analyze', { history: chatHistory })
            .then(res => console.log("Dữ liệu phân tích:", res.data))
            .catch(err => console.error("Lỗi phân tích:", err));
        } else {
          // TRƯỜNG HỢP 2: Chưa kết thúc -> Bật lại Mic để nghe tiếp
          setIsListening(true);
          startListening(); 
        }
      });
    } catch (error) {
      console.error("Lỗi gọi Gemini:", error);
    }
  };
  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-play disclaimer on component mount (client-side only)
  useEffect(() => {
    if (isMounted && callStatus === 'disclaimer' && !hasPlayedDisclaimer) {
      setHasPlayedDisclaimer(true);
      
      // Play disclaimer, then show buttons
      speakText(disclaimerText, () => {
        setShowButtons(true);
      });
    }
  }, [isMounted, callStatus, hasPlayedDisclaimer]);

  return (
    <div className={styles.container}>
      {/* Top Disclaimer */}
      <div className={styles.topDisclaimer}>
        <p>Your voice is not being recorded, only your answers are being transcribed</p>
      </div>

      {/* Begin Screen - Initial start button */}
      {callStatus === 'start' && (
        <div className={styles.screen}>
          <div className={styles.avatar}>
            <div className={`${styles.ear} ${styles.left}`}></div>
            <div className={`${styles.ear} ${styles.right}`}></div>
            <div className={styles.monkeyHead}></div>
            <div className={styles.faceArea}>
              <div className={`${styles.eye} ${styles.left}`}></div>
              <div className={`${styles.eye} ${styles.right}`}></div>
              <div className={styles.nose}></div>
              <div className={styles.mouth}></div>
            </div>
          </div>
          <div className={styles.buttons}>
            <button className={styles.answer} onClick={handleBegin}>
              Begin Call
            </button>
          </div>
        </div>
      )}

      {/* Disclaimer Screen - Monkey speaks, then buttons appear */}
      {callStatus === 'disclaimer' && (
        <div className={styles.screen}>
          <div className={`${styles.avatar} ${isListening ? styles.listening : ''}`}>
            <div className={`${styles.ear} ${styles.left}`}></div>
            <div className={`${styles.ear} ${styles.right}`}></div>
            <div className={styles.monkeyHead}></div>
            <div className={styles.faceArea}>
              <div className={`${styles.eye} ${styles.left}`}></div>
              <div className={`${styles.eye} ${styles.right}`}></div>
              <div className={styles.nose}></div>
              <div className={`${styles.mouth} ${isSpeaking ? styles.open : ''}`}></div>
            </div>
          </div>
          {subtitle && (
            <div className={styles.subtitle}>
              {subtitle}
            </div>
          )}
          {showButtons && (
            <div className={styles.buttons}>
              <button className={styles.answer} onClick={handleAnswer}>
                Answer
              </button>
              <button className={styles.decline} onClick={handleDecline}>
                Decline
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Call Screen - Normal conversation */}
      {callStatus === 'active' && (
        <div className={styles.screen}>
          <div className={`${styles.avatar} ${isListening ? styles.listening : ''}`}>
            <div className={`${styles.ear} ${styles.left}`}></div>
            <div className={`${styles.ear} ${styles.right}`}></div>
            <div className={styles.monkeyHead}></div>
            <div className={styles.faceArea}>
              <div className={`${styles.eye} ${styles.left}`}></div>
              <div className={`${styles.eye} ${styles.right}`}></div>
              <div className={styles.nose}></div>
              <div className={`${styles.mouth} ${isSpeaking ? styles.open : ''}`}></div>
            </div>
          </div>
          <p className={styles.status}>
            {isSpeaking ? '🗣️ Speaking...' : isListening ? '🎧 Listening...' : 'Idle'}
          </p>
          {subtitle && (
            <div className={styles.subtitle}>
              {subtitle}
            </div>
          )}
        </div>
      )}

      {/* Rating Screen - 5 star rating */}
      {callStatus === 'rating' && (
        <div className={styles.screen}>
          <h2>Rate Your Experience</h2>
          <div className={styles.starRating}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`${styles.star} ${rating >= star ? styles.filled : ''}`}
                onClick={() => handleRating(star)}
              >
                ★
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className={styles.thankYou}>Thank you for your feedback!</p>
          )}
        </div>
      )}
    </div>
  );
}
