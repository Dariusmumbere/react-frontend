import { useState, useRef, useEffect } from 'react';
import { 
  Box, CssBaseline, AppBar, Toolbar, Typography, TextField, 
  IconButton, Paper, Avatar, List, ListItem, ListItemAvatar, 
  ListItemText, CircularProgress, styled, Drawer, Divider,
  Button, ListItemButton, ListItemIcon, Snackbar, Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import HistoryIcon from '@mui/icons-material/History';
import MenuIcon from '@mui/icons-material/Menu';
import DeleteIcon from '@mui/icons-material/Delete';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';

// Custom styled components
const GradientAppBar = styled(AppBar)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
}));

const ChatContainer = styled(Box)(({ theme }) => ({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default,
}));

const MessageList = styled(List)({
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '4px',
  },
});

const InputContainer = styled(Paper)(({ theme }) => ({
  padding: '16px',
  margin: '16px',
  borderRadius: '24px',
  boxShadow: theme.shadows[6],
  display: 'flex',
  alignItems: 'center',
}));

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const messagesEndRef = useRef(null);

  // Show snackbar notification
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Fetch all conversations
  const fetchConversations = async () => {
    try {
      const response = await fetch('https://react-zlhw.onrender.com/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      showSnackbar('Failed to load conversation history', 'error');
    }
  };

  // Load a specific conversation
  const loadConversation = async (conversationId) => {
    try {
      setIsLoading(true);
      const response = await fetch(`https://react-zlhw.onrender.com/${conversationId}/messages`);
      if (!response.ok) throw new Error('Failed to load conversation');
      
      const data = await response.json();
      const formattedMessages = data.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      
      setMessages(formattedMessages);
      setCurrentConversationId(conversationId);
      setDrawerOpen(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
      showSnackbar('Failed to load conversation', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a conversation
  const deleteConversation = async (conversationId, event) => {
    event.stopPropagation(); // Prevent triggering the load conversation
    try {
      const response = await fetch(`https://react-zlhw.onrender.com/${conversationId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete conversation');
      
      // If we're deleting the current conversation, clear it
      if (currentConversationId === conversationId) {
        startNewConversation();
      }
      
      // Refresh conversation list
      await fetchConversations();
      showSnackbar('Conversation deleted', 'success');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      showSnackbar('Failed to delete conversation', 'error');
    }
  };

  // Start a new conversation
  const startNewConversation = () => {
    setMessages([{
      id: 'welcome',
      content: "Hello! I'm your Gemini AI assistant. How can I help you today?",
      sender: 'assistant',
      timestamp: new Date()
    }]);
    setCurrentConversationId(null);
    setDrawerOpen(false);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('https://react-zlhw.onrender.com/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          conversation_id: currentConversationId || undefined
        })
      });

      if (!response.ok) throw new Error('Failed to send message');
      
      const data = await response.json();
      
      const assistantMessage = {
        id: Date.now().toString(),
        content: data.response,
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // If this was a new conversation, update the ID and refresh list
      if (!currentConversationId) {
        setCurrentConversationId(data.conversation_id);
        await fetchConversations();
      } else {
        // Just refresh the conversation list to update timestamps
        await fetchConversations();
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: "Sorry, I encountered an error. Please try again.",
        sender: 'assistant',
        timestamp: new Date()
      }]);
      showSnackbar('Failed to send message', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Initialize with conversations
  useEffect(() => {
    fetchConversations();
    
    // Sample welcome message for new chats
    if (!currentConversationId && messages.length === 0) {
      startNewConversation();
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get current conversation title
  const getCurrentTitle = () => {
    if (!currentConversationId) return 'New Chat';
    const conv = conversations.find(c => c.id === currentConversationId);
    return conv?.title || 'Chat';
  };

  return (
    <>
      <CssBaseline />
      <ChatContainer>
        <GradientAppBar position="static" elevation={0}>
          <Toolbar>
            <IconButton 
              edge="start" 
              color="inherit" 
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {getCurrentTitle()}
            </Typography>
          </Toolbar>
        </GradientAppBar>

        {/* Conversation History Sidebar */}
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: 300,
              boxSizing: 'border-box',
              background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)'
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Chat History</Typography>
            <Button 
              variant="contained" 
              fullWidth 
              onClick={startNewConversation}
              sx={{ mt: 2, mb: 2 }}
            >
              New Chat
            </Button>
            <Divider />
          </Box>
          <List sx={{ overflowY: 'auto', flex: 1 }}>
            {conversations.map((conversation) => (
              <ListItemButton
                key={conversation.id}
                selected={conversation.id === currentConversationId}
                onClick={() => loadConversation(conversation.id)}
                sx={{
                  '&:hover .delete-button': {
                    visibility: 'visible'
                  }
                }}
              >
                <ListItemIcon>
                  <HistoryIcon />
                </ListItemIcon>
                <ListItemText 
                  primary={conversation.title} 
                  secondary={new Date(conversation.updated_at).toLocaleString()}
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                />
                <IconButton
                  edge="end"
                  className="delete-button"
                  onClick={(e) => deleteConversation(conversation.id, e)}
                  sx={{
                    visibility: 'hidden',
                    '&:hover': {
                      color: 'error.main'
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemButton>
            ))}
          </List>
        </Drawer>

        <MessageList>
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ListItem sx={{
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  px: 2,
                  py: 1
                }}>
                  {message.sender === 'assistant' && (
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <SmartToyOutlinedIcon />
                      </Avatar>
                    </ListItemAvatar>
                  )}
                  <Paper
                    elevation={2}
                    sx={{
                      p: 2,
                      ml: message.sender === 'assistant' ? 0 : 2,
                      mr: message.sender === 'user' ? 0 : 2,
                      maxWidth: '80%',
                      backgroundColor: message.sender === 'user' ? 'primary.main' : 'background.paper',
                      color: message.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                      borderRadius: message.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    }}
                  >
                    <Markdown>{message.content}</Markdown>
                    <Typography variant="caption" display="block" sx={{
                      textAlign: 'right',
                      mt: 1,
                      opacity: 0.7,
                      color: message.sender === 'user' ? 'primary.contrastText' : 'text.secondary'
                    }}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Paper>
                  {message.sender === 'user' && (
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <Avatar sx={{ bgcolor: 'secondary.main' }}>
                        <PersonOutlineIcon />
                      </Avatar>
                    </ListItemAvatar>
                  )}
                </ListItem>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
          {isLoading && (
            <ListItem sx={{ justifyContent: 'flex-start' }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <SmartToyOutlinedIcon />
                </Avatar>
              </ListItemAvatar>
              <Paper elevation={2} sx={{ p: 2, borderRadius: '18px 18px 18px 4px' }}>
                <CircularProgress size={20} />
              </Paper>
            </ListItem>
          )}
        </MessageList>

        <InputContainer>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            multiline
            maxRows={4}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '20px',
                '& fieldset': {
                  border: 'none',
                },
              },
              flex: 1,
              mr: 2,
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            sx={{
              backgroundColor: 'primary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '&:disabled': {
                backgroundColor: 'action.disabledBackground',
              },
            }}
          >
            <SendIcon />
          </IconButton>
        </InputContainer>
      </ChatContainer>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}