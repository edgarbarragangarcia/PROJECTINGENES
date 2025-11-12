'use client';

import { useState, useEffect, useRef } from 'react';

interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
  isSupported: boolean;
}

export const useSpeechRecognition = (onTranscriptChange: (transcript: string) => void): SpeechRecognitionHook => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Use any for cross-environment compatibility; browsers expose SpeechRecognition on window
  const recognitionRef = useRef<any | null>(null);

  const isSupported = typeof globalThis !== 'undefined' && ((globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition);

  useEffect(() => {
    if (!isSupported) {
      setError('El reconocimiento de voz no es compatible con este navegador.');
      return;
    }

  const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';

    recognitionRef.current = recognition;

  recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        onTranscriptChange(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      setError(`Error de reconocimiento de voz: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening) {
        // Restart recognition if it stops automatically
        recognition.start();
      }
    };

    return () => {
      recognition.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported]);
  
  useEffect(() => {
    if(isListening) {
        setTranscript(''); // Clear previous transcript on start
    }
  }, [isListening])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript(''); // Clear transcript before starting
      recognitionRef.current.start();
      setIsListening(true);
      setError(null);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return { isListening, transcript, startListening, stopListening, error, isSupported };
};
