const express = require('express');
const app = express();
const axios = require('axios');

const VERIFY_TOKEN = 'evamats_verify'; // ← заміни на свій токен
const FORWARD_URL = 'https://hook.eu2.make.com/1xapxaalrxhtlew81ebtmfdqsp49fpzx'; // ← твій Webhook з Make

app.use(express.json());

// GET — перевірка від Facebook
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Verified webhook');
      res.status(200).send(challenge);
    } else {
      console.log('❌ Verification failed: invalid mode or token');
      res.sendStatus(403);
    }
  } else {
    console.log('Welcome to webhook server');
    res.send('Welcome to webhook server');
  }
});

// POST — реальні повідомлення (пересилаємо в Make)
app.post('/', async (req, res) => {
  const body = req.body;

  const shouldForward = body.entry?.some(entry => {
    if (entry.messaging) return true;

    const facebookComment = entry.changes?.some(change =>
      change.field === 'feed' &&
      change.value?.item === 'comment' &&
      change.value?.verb === 'add'
    );

    const instagramComment = entry.changes?.some(change =>
      change.field === 'comments' &&
      body.object === 'instagram'
    );

    return facebookComment || instagramComment;
  });

  if (shouldForward) {
    try {
      await axios.post(FORWARD_URL, body);
      res.sendStatus(200);
    } catch (err) {
      console.error('❌ Error forwarding to Make:', err);
      res.sendStatus(500);
    }
  } else {
    console.log('⏭️ Skipped event (not comment or message)');
    res.sendStatus(200);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
