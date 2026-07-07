import type { LLMProvider } from '../../types/apiKey.types';

export interface GeminiInlineData {
  mimeType: string;
  data: string;
}

export interface GeminiPart {
  text?: string;
  inlineData?: GeminiInlineData;
}

export type OpenAIImageContent = {
  type: 'image_url';
  image_url: { url: string };
};

export type OpenAITextContent = {
  type: 'text';
  text: string;
};

export type OpenAIMessageContent = string | Array<OpenAITextContent | OpenAIImageContent>;

export interface AnthropicImageContent {
  type: 'image';
  source: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export type AnthropicMessageContent = string | Array<{ type: 'text'; text: string } | AnthropicImageContent>;

export interface ModelOption {
  value: string;
  label: string;
}

export interface ApiErrorBody {
  error?: {
    message?: string;
    status?: string;
    type?: string;
    code?: string;
  };
}

export type ProviderConfig = Record<LLMProvider, { url: string; defaultModel: string }>;
export type PopularModelsConfig = Record<LLMProvider, ModelOption[]>;
export type DifficultyLabelsConfig = Record<number, string>;
