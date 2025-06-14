import React, { useState, useRef } from 'react';
import { marked } from 'marked';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    setMessages((msgs) => [...msgs, { role: 'user', content: input }]);
    setLoading(true);
    let aiContent = '';
    const newMsg = { role: 'assistant', content: '' };
    setMessages((msgs) => [...msgs, newMsg]);

    // 使用 EventSource 兼容 SSE
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: input })
    });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let buffer = '';
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();
        for (const part of parts) {
          if (part.startsWith('data: ')) {
            try {
              const data = JSON.parse(part.slice(6));
              if (data.content) {
                aiContent += data.content.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"');
                setMessages((msgs) => {
                  const updated = [...msgs];
                  updated[updated.length - 1] = { role: 'assistant', content: aiContent };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    }
    setLoading(false);
    setInput('');
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>AI 对话演示</h2>
      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, minHeight: 300, background: '#fafbfc' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ margin: '12px 0', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
            <div style={{ display: 'inline-block', maxWidth: '90%', background: msg.role === 'user' ? '#d2eafd' : '#f3f3f3', borderRadius: 6, padding: 8 }}>
              <span dangerouslySetInnerHTML={{ __html: marked.parse(msg.content || '') }} />
            </div>
          </div>
        ))}
        {loading && <div style={{ color: '#aaa' }}>AI 正在思考...</div>}
      </div>
      <div style={{ display: 'flex', marginTop: 16 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={2}
          style={{ flex: 1, resize: 'none', borderRadius: 4, border: '1px solid #ccc', padding: 8 }}
          placeholder="请输入你的问题..."
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{ marginLeft: 8, padding: '0 20px', borderRadius: 4, border: 'none', background: '#1677ff', color: '#fff', fontWeight: 600 }}
        >发送</button>
      </div>
    </div>
  );
}
