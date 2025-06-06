const express = require('express');
const app = express();
const PORT = 3000;

// Ollama API 配置
const BASE_URL = 'http://localhost:11434';
const MODEL_NAME = 'deepseek-r1:7b'; // 替换为你使用的模型名称

// 中间件，解析JSON请求体
app.use(express.json());

// SSE 接口，用于流式获取模型回复
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: '缺少必需的prompt参数' });
    }

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 发送初始数据
    res.write('data: {"status": "started"}\n\n');

    // 调用Ollama API并流式返回结果
    const ollamaResponse = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: 'user', content: prompt }],
        stream: true, // 启用流式响应
      }),
    });

    if (!ollamaResponse.ok) {
      throw new Error(`HTTP error! status: ${ollamaResponse.status}`);
    }

    // 处理流式响应
    const reader = ollamaResponse.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        res.write('data: {"status": "completed"}\n\n');
        break;
      }

      // 解码并处理接收到的数据
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((line) => line.trim() !== '');

      for (const line of lines) {
        console.log('line >>>', line);
        const data = line;
        try {
          const parsed = JSON.parse(data);
          if (parsed.message?.content) {
            res.write(
              `data: {"content": "${escapeSse(parsed.message.content)}"}\n\n`
            );
          }
        } catch (e) {
          console.error('解析Ollama响应失败:', e);
        }
      }
    }

    res.end();
  } catch (error) {
    console.error('调用API时出错:', error.message);
    res.write(`data: {"error": "抱歉，发生了错误: ${error.message}"}\n\n`);
    res.end();
  }
});

// 辅助函数：转义SSE数据中的特殊字符
function escapeSse(text) {
  return text.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/"/g, '\\"');
}

// 启动服务
app.listen(PORT, () => {
  console.log(`服务运行在 http://localhost:${PORT}`);
});
