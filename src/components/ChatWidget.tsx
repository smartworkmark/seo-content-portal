'use client';

import { useEffect } from 'react';
import '@n8n/chat/style.css';

export default function ChatWidget() {
  useEffect(() => {
    import('@n8n/chat').then(({ createChat }) => {
      createChat({
        webhookUrl: process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL || '',
        mode: 'window',
        showWelcomeScreen: false,
        loadPreviousSession: false,
        enableStreaming: false,
        initialMessages: [
          'What questions do you have about content posting for a specific practice?',
        ],
        i18n: {
          en: {
            title: 'Content Portal Assistant',
            subtitle: '',
            footer: '',
            getStarted: 'New Conversation',
            inputPlaceholder: 'Type your question...',
            closeButtonTooltip: 'Close',
          },
        },
      });
    });
  }, []);

  return null;
}
