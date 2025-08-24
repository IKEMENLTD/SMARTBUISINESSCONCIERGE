require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();

// Claude API設定
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// LINE設定
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new line.Client(config);

// LINEからのメッセージを受け取る
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// Claude APIでメッセージ処理
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;
  console.log('ユーザーメッセージ:', userMessage);
  
  try {
    // Claude APIに送信
    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307", // 一番安いモデル
      max_tokens: 150, // token節約
      messages: [
        {
          role: "user",
          content: `あなたはプログラミング学習をサポートするAIアシスタントです。簡潔に答えてください。\n\nユーザーの質問: ${userMessage}`
        }
      ],
    });

    const aiResponse = message.content[0].text;
    console.log('Claude回答:', aiResponse);

    // LINEに返信
    const replyMessage = {
      type: 'text',
      text: aiResponse
    };

    return client.replyMessage(event.replyToken, replyMessage);
    
  } catch (error) {
    console.error('Claude API エラー:', error);
    
    const errorMessage = {
      type: 'text',
      text: 'すみません、現在システムにエラーが発生しています🙇‍♂️\nしばらくしてからもう一度お試しください。'
    };
    
    return client.replyMessage(event.replyToken, errorMessage);
  }
}

// ヘルスチェック
app.get('/', (req, res) => {
  res.send('LINEボットが稼働中です！🤖');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 サーバー起動: ポート ${PORT}`);
});