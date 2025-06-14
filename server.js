require('dotenv').config();
const express = require('express');
const timeout = require('connect-timeout');
const app = express();

// 从环境变量获取配置
const MODEL_NAME = process.env.MODEL_NAME;
const ARK_API_KEY = process.env.ARK_API_KEY;
const PORT = process.env.PORT || 3000;
const API_BASE_URL = process.env.API_BASE_URL;

// 中间件配置
app.use(express.json());
app.use(timeout('30s'));
app.use((req, res, next) => {
  if (!req.timedout) next();
});

// 请求验证中间件
const validateChatRequest = (req, res, next) => {
  const { query } = req.body;
  if (!query?.trim()) {
    return res.status(400).json({ error: '查询内容不能为空' });
  }
  next();
};

// 辅助函数：转义SSE数据中的特殊字符
function escapeSse(text) {
  return text.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/"/g, '\\"');
}

// 处理SSE响应
async function handleSseResponse(res, stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        
        const data = line.slice(5).trim();
        if (data === '[DONE]') {
          res.write('data: {"status": "completed"}\n\n');
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          if (parsed.choices) {
            res.write(`data: {"content": "${escapeSse(parsed.choices[0].delta.content)}"}\n\n`);
          }
        } catch (e) {
          console.error('解析响应失败:', e);
        }
      }
    }
  } catch (error) {
    throw new Error(`流处理错误: ${error.message}`);
  } finally {
    reader.releaseLock();
  }
}

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SSE 接口，用于流式获取模型回复
app.post('/api/chat', validateChatRequest, async (req, res) => {
  try {
    const { query } = req.body;

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 发送初始数据
    res.write('data: {"status": "started"}\n\n');

    // 调用API并流式返回结果
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ARK_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: 'user', content: query }],
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    await handleSseResponse(res, response.body);
    res.end();
  } catch (error) {
    console.error('调用API时出错:', error.message);
    res.write(`data: {"error": "抱歉，发生了错误: ${error.message}"}\n\n`);
    res.end();
  }
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`服务运行在 http://localhost:${PORT}`);
});
