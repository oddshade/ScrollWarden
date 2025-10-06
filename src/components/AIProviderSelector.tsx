import React, { useState, useEffect } from 'react';
import { AIProviderType } from '../types/index.ts';
import { getAvailableProviders, getCurrentAIProvider, setAIProvider } from '../services/aiService.ts';

interface AIProviderSelectorProps {
  onProviderChange?: (provider: AIProviderType) => void;
}

export const AIProviderSelector: React.FC<AIProviderSelectorProps> = ({ onProviderChange }) => {
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType>(getCurrentAIProvider());
  const [isOpen, setIsOpen] = useState(false);
  const availableProviders = getAvailableProviders();

  // Get API key status for a provider
  const getAPIKeyStatus = (providerType: AIProviderType) => {
    const rawApiKey = providerType === 'openai' 
      ? import.meta.env.VITE_OPENAI_API_KEY
      : import.meta.env.VITE_GEMINI_API_KEY;
    
    const apiKey = rawApiKey ? rawApiKey.replace(/\u0000/g, '').trim() : '';
    
    if (!apiKey) return { status: 'missing', label: 'No API Key' };
    
    const isValid = providerType === 'openai' 
      ? apiKey !== 'your_openai_api_key_here' && apiKey.startsWith('sk-')
      : apiKey !== 'your_gemini_api_key_here' && apiKey.length > 10;
    
    return isValid 
      ? { status: 'valid', label: 'Connected' }
      : { status: 'invalid', label: 'Invalid Key' };
  };

  const handleProviderSelect = (providerType: AIProviderType) => {
    setSelectedProvider(providerType);
    setAIProvider(providerType);
    setIsOpen(false);
    onProviderChange?.(providerType);
  };

  const getCurrentStatus = () => {
    const status = getAPIKeyStatus(selectedProvider);
    return status.status === 'valid' 
      ? { color: 'bg-green-100 text-green-800', label: availableProviders.find(p => p.type === selectedProvider)?.name || 'Unknown' }
      : { color: 'bg-orange-100 text-orange-800', label: 'Demo Mode' };
  };

  const currentStatus = getCurrentStatus();

  return (
    <div className="relative">
      {/* Current Selection Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          px-2 py-1 rounded-full text-xs font-medium transition-all duration-200
          ${currentStatus.color}
          hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        `}
        title="Click to change AI provider"
      >
        <span className="flex items-center space-x-1">
          <span>{currentStatus.label}</span>
          <svg 
            className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-2 py-1 border-b border-gray-100 mb-1">
                Choose AI Provider
              </div>
              
              {availableProviders.map((provider) => {
                const apiKeyStatus = getAPIKeyStatus(provider.type);
                const isSelected = provider.type === selectedProvider;
                
                return (
                  <button
                    key={provider.type}
                    onClick={() => handleProviderSelect(provider.type)}
                    className={`
                      w-full text-left px-2 py-2 rounded-md text-sm transition-all duration-150
                      ${isSelected 
                        ? 'bg-blue-50 text-blue-900 border border-blue-200' 
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`
                          w-2 h-2 rounded-full
                          ${isSelected ? 'bg-blue-500' : 'bg-transparent border border-gray-300'}
                        `} />
                        <span className="font-medium">{provider.name}</span>
                      </div>
                      
                      <div className={`
                        px-2 py-0.5 rounded text-xs font-medium
                        ${apiKeyStatus.status === 'valid' 
                          ? 'bg-green-100 text-green-700' 
                          : apiKeyStatus.status === 'invalid'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                        }
                      `}>
                        {apiKeyStatus.label}
                      </div>
                    </div>
                  </button>
                );
              })}
              
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-500 px-2 py-1">
                  💡 Set API keys in your .env file:
                  <br />
                  <code className="text-xs bg-gray-100 px-1 rounded">VITE_OPENAI_API_KEY</code>
                  <br />
                  <code className="text-xs bg-gray-100 px-1 rounded">VITE_GEMINI_API_KEY</code>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIProviderSelector;