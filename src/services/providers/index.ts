import { AIProvider, AIProviderType } from '../../types/index.ts';
import { openaiProvider } from './openaiProvider.ts';
import { geminiProvider } from './geminiProvider.ts';

// Registry of available AI providers
export const AI_PROVIDERS: Record<AIProviderType, AIProvider> = {
  openai: openaiProvider,
  gemini: geminiProvider
};

// Default provider
export const DEFAULT_PROVIDER: AIProviderType = 'gemini';

// Get available provider names for UI
export function getAvailableProviders(): Array<{type: AIProviderType, name: string}> {
  return Object.entries(AI_PROVIDERS).map(([type, provider]) => ({
    type: type as AIProviderType,
    name: provider.config.name
  }));
}

// Get provider by type
export function getProvider(type: AIProviderType): AIProvider {
  const provider = AI_PROVIDERS[type];
  if (!provider) {
    throw new Error(`Provider ${type} not found`);
  }
  return provider;
}