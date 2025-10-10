import { AIProvider, AIProviderConfig, PDFFile, AIResponse } from '../../types/index.ts';
import { constructAIPrompt, parseAIResponse } from './promptUtils.ts';

export const geminiConfig: AIProviderConfig = {
  name: 'Google Gemini',
  apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  model: 'gemini-2.5-flash',
  maxTokens: 8192,
  temperature: 1
};

/**
 * Google Gemini API implementation
 */
async function callGeminiAPI(question: string, pdfFiles: PDFFile[], apiKey: string): Promise<AIResponse> {
  const prompt = constructAIPrompt(question, pdfFiles);
  
  try {
    const response = await fetch(geminiConfig.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: geminiConfig.temperature,
          maxOutputTokens: geminiConfig.maxTokens,
          topP: 0.8,
          topK: 10
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`Gemini API error: ${errorMessage}`);
    }

    const data = await response.json();
    const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponseText) {
      // Handle potential safety filter blocks
      if (data.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('Response was blocked by Gemini safety filters. Please try rephrasing your question.');
      }
      throw new Error('No response content from Gemini API');
    }

    return parseAIResponse(aiResponseText);
  } catch (error) {
    if (error instanceof Error) {
      // Provide more specific error messages
      if (error.message.includes('403')) {
        throw new Error('Invalid Gemini API key or insufficient permissions. Please check your VITE_GEMINI_API_KEY.');
      } else if (error.message.includes('429')) {
        throw new Error('Gemini API rate limit exceeded. Please try again in a moment.');
      } else if (error.message.includes('400')) {
        throw new Error('Invalid request to Gemini API. Please check your input.');
      }
    }
    throw error;
  }
}

export const geminiProvider: AIProvider = {
  type: 'gemini',
  config: geminiConfig,
  callAPI: callGeminiAPI
};