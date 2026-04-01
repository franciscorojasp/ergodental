// src/lib/ollama.ts

interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
}

export class OllamaService {
  private static baseUrl = 'http://localhost:11434';

  static async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      console.error('Ollama connection failed:', error);
      return false;
    }
  }

  static async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error('Error listing models:', error);
      return [];
    }
  }

  static async chat(
    model: string,
    messages: OllamaMessage[],
    onChunk?: (text: string) => void
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: !!onChunk,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Ollama Error: ${err}`);
      }

      if (onChunk) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        if (!reader) throw new Error('Response body is null');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const json: OllamaChatResponse = JSON.parse(line);
              if (json.message?.content) {
                fullText += json.message.content;
                onChunk(json.message.content);
              }
            } catch (e) {
              console.warn('Error parsing chunk:', line);
            }
          }
        }
        return fullText;
      } else {
        const data: OllamaChatResponse = await response.json();
        return data.message.content;
      }
    } catch (error) {
      console.error('Ollama Chat Error:', error);
      throw error;
    }
  }
}
