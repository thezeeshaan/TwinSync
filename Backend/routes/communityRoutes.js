const express = require('express');
const router = express.Router();
const { verifySupabaseToken } = require('../middleware/verifySupabaseToken');
const {
  getPeers,
  getConversations,
  startConversation,
  getMessages,
  sendMessage
} = require('../controllers/communityController');

// All community routes require authentication
router.use(verifySupabaseToken);

// Peer list (same institute, consent-filtered)
router.get('/peers', getPeers);

// Conversation list (with last message preview + unread count)
router.get('/conversations', getConversations);

// Start or get existing conversation with a peer
router.post('/conversations/:peerId', startConversation);

// Messages within a conversation
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);

module.exports = router;
