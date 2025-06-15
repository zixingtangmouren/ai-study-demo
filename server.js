require('dotenv').config();
const express = require('express');
const timeout = require('connect-timeout');
const app = express();

// 从环境变量获取配置
const MODEL_NAME = process.env.MODEL_NAME;
const ARK_API_KEY = process.env.ARK_API_KEY;
const PORT = process.env.PORT || 3000;
const API_BASE_URL = process.env.API_BASE_URL;

// 历史对话记录
let historyMessages = [];

// 历史对话总结
let summarizeContent = '';

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

// 总结过去的对话
const getSummarizeHistory = async () => {
  // 调用API并流式返回结果
  const response = await fetch(`${API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ARK_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: [
        {
          role: 'system',
          content: `
              ## 角色
              你是一个专业摘要总结大师，你能够根据用户的历史对话内容，总结出用户的重点和核心内容。
  
              ## 历史对话
              这是历史对话的总结：${summarizeContent}
              这是新一轮的对话内容：${historyMessages.map((item) => `${item.role}: ${item.content}`).join('\n')}

  
              ## 输出规范
              - 你只需要输出总结的内容，不需要其他任何解释。
              `,
        },
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  summarizeContent = await handleSseResponse(null, response.body);
  console.log('summarizeContent >>>', summarizeContent);
  historyMessages = [];
};

// 处理SSE响应
async function handleSseResponse(res, stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  let content = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;

        const data = line.slice(5).trim();
        if (data === '[DONE]') {
          res && res.write('data: {"status": "completed"}\n\n');
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          if (parsed.choices) {
            content += parsed.choices[0].delta.content;
            res && res.write(`data: {"content": "${escapeSse(parsed.choices[0].delta.content)}"}\n\n`);
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

  return content;
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

    // 拼接过去三轮的对话
    // const rounds = 3;
    // const history = historyMessages
    //   .slice(-rounds * 2)
    //   .map((msg) => `${msg.role}: ${msg.content}`)
    //   .join('\n');

    // 记录用户输入
    historyMessages.push({ role: 'user', content: query });

    // 模拟通过外部检索到的内容
    let externalContent = 'TestComp 是一个测试组件，它有 open、isDev、onChange 三个属性';

    // 调用API并流式返回结果
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          {
            role: 'system',
            content: `
            ## 角色
            你是一个专业的前端编程导师，你擅长 React、Webpack、Antd 这些前端流程的框架。你能够由浅入深的回答用户关于前端的问题。

            ## 历史对话
            ${summarizeContent}

            ## 参考内容
            你可以基于这些参考内容回答用户的问题： ${externalContent}

            ## 输出规范
            - 关于代码的问题，你能够按照“设计思路”、“代码实现“两个维度来回答。
            - 跟编程无关的问题，你可以拒绝回答。
            `,
          },
          { role: 'user', content: query }, // 用户的输入
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const aiContent = await handleSseResponse(res, response.body);

    if (aiContent) {
      historyMessages.push({ role: 'assistant', content: aiContent });

      // LLM 总结法
      getSummarizeHistory();
    }

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
