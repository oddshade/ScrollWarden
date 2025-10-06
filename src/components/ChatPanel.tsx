import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, Citation, OnChatSubmit, OnCitationClick } from '../types/index.ts';
import AIProviderSelector from './AIProviderSelector.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';

interface ChatPanelProps {
  messages: ChatMessage[];
  isAiThinking: boolean;
  canSubmit: boolean;
  onSubmit: OnChatSubmit;
  onCitationClick: OnCitationClick;
}

interface MessageBubbleProps {
  message: ChatMessage;
  onCitationClick: OnCitationClick;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onCitationClick }) => {
  const isUser = message.type === 'user';

  const handleCitationClick = (citation: Citation) => {
    onCitationClick(citation);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] w-full`}>
        <div
          className={`
            px-3 py-2 rounded-lg shadow-sm
            ${isUser 
              ? 'bg-blue-500 text-white rounded-br-sm ml-auto' 
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm mr-auto'
            }
          `}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MarkdownRenderer content={message.content} isUserMessage={false} />
          )}
          
          {message.citation && (
            <div className="mt-2 pt-2 border-t border-blue-400">
              <button
                onClick={() => handleCitationClick(message.citation!)}
                className="citation-button inline-flex items-center px-2 py-1 bg-blue-600 bg-opacity-20 hover:bg-opacity-30 rounded text-xs font-medium transition-all"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Source: {message.citation.documentName}, Page {message.citation.pageNumber}
              </button>
            </div>
          )}
        </div>
        
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  );
};

const ThinkingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%]">
        <div className="bg-white border border-gray-200 text-gray-800 rounded-lg rounded-bl-sm px-3 py-2 shadow-sm mr-auto">
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-600">AI is thinking</span>
            <div className="thinking-dots text-gray-600"></div>
          </div>
          <div className="flex space-x-1 mt-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isAiThinking,
  canSubmit,
  onSubmit,
  onCitationClick
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleSubmit = useCallback(() => {
    if (!inputValue.trim() || !canSubmit || isAiThinking) return;
    
    onSubmit(inputValue);
    setInputValue('');
  }, [inputValue, canSubmit, isAiThinking, onSubmit]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && !isComposing) {
      event.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit, isComposing]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
  }, []);

  const isInputDisabled = !canSubmit || isAiThinking;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-800">AI Assistant</h3>
          <AIProviderSelector />
        </div>
        <div className="flex items-center space-x-2">
          <div className={`
            w-2 h-2 rounded-full
            ${isAiThinking ? 'bg-yellow-400 animate-pulse' : canSubmit ? 'bg-green-400' : 'bg-gray-400'}
          `}></div>
          <span className="text-xs text-gray-600 font-medium">
            {isAiThinking ? 'Processing...' : canSubmit ? 'Ready' : 'No PDFs'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0">
        {messages.length === 0 && !isAiThinking ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg font-medium text-gray-700 mb-2">Ready to help!</p>
            <p className="text-sm text-gray-500 max-w-xs">
              Upload a PDF and ask me questions about its content. I'll provide answers with citations to the exact pages.
            </p>
            {!canSubmit && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Please upload and wait for PDFs to be processed before asking questions.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onCitationClick={onCitationClick}
              />
            ))}
            
            {isAiThinking && <ThinkingIndicator />}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={
                !canSubmit 
                  ? "Upload a PDF to start asking questions..." 
                  : isAiThinking
                  ? "AI is processing your request..."
                  : "Ask a question about your PDFs... (Enter to send, Shift+Enter for new line)"
              }
              disabled={isInputDisabled}
              className={`
                w-full px-3 py-2 border border-gray-300 rounded-lg resize-none
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
                placeholder:text-gray-400
                min-h-[2.5rem] max-h-[7.5rem]
              `}
              rows={1}
            />
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isInputDisabled}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all duration-200
              ${(!inputValue.trim() || isInputDisabled)
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 shadow-sm hover:shadow-md'
              }
            `}
            title={
              !canSubmit 
                ? "Upload and process PDFs first"
                : isAiThinking 
                ? "Please wait for AI response"
                : "Send message"
            }
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          {canSubmit && !isAiThinking && (
            <span>💡 I'll search through your PDFs and provide answers with page citations</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;