require('dotenv/config');

const { OpenAIEmbeddings } = require('@langchain/openai');
const { TextLoader } = require('langchain/document_loaders/fs/text');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { FaissStore } = require('@langchain/community/vectorstores/faiss');

const { filePtah, dbPath } = require('./constants');

const run = async () => {
  // 加载文本
  const loader = new TextLoader(filePtah);
  const docs = await loader.load();

  // 分割文本
  const splitter = new RecursiveCharacterTextSplitter();

  const splitDocs = await splitter.splitDocuments(docs);

  // 向量化
  const embeddings = new OpenAIEmbeddings({
    model: process.env.EMBEDDING_MODEL,
    configuration: {
      apiKey: process.env.ARK_API_KEY,
      baseURL: process.env.API_BASE_URL,
    },
  });

  // 分批处理，每次最多处理200个文档
  const batchSize = 200;
  for (let i = 0; i < splitDocs.length; i += batchSize) {
    const batch = splitDocs.slice(i, i + batchSize);
    const vectorStore = await FaissStore.fromDocuments(batch, embeddings);

    await vectorStore.save(dbPath);
  }
};

run();
