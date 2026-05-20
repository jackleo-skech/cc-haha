import { api } from './client'

export const translateApi = {
  translate: (text: string, targetLang?: string) =>
    api.post<{ translatedText: string }>('/api/translate', { text, targetLang: targetLang ?? 'Chinese' }),
}