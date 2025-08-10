import { useState, useRef, useEffect } from 'react';
import { 
  Box, CssBaseline, AppBar, Toolbar, Typography, TextField, 
  IconButton, Paper, Avatar, List, ListItem, ListItemAvatar, 
  ListItemText, CircularProgress, styled, Drawer, Divider,
  Button, ListItemButton, ListItemIcon, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Menu, MenuItem
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import HistoryIcon from '@mui/icons-material/History';
import MenuIcon from '@mui/icons-material/Menu';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';
import { GoogleLogin, googleLogout, useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import jwt_decode from 'jwt-decode';

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
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [user, setUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const messagesEndRef = useRef(null);

  // Check for existing token on initial load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwt_decode(token);
        setUser(decoded);
        fetchConversations();
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
  }, []);

  // Show snackbar notification
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Handle user menu
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle login with email/password
  const handleEmailLogin = async () => {
    try {
      const response = await axios.post('https://react-zlhw.onrender.com/auth/login', {
        email,
        password
      });
      
      localStorage.setItem('token', response.data.token);
      const decoded = jwt_decode(response.data.token);
      setUser(decoded);
      setAuthDialogOpen(false);
      fetchConversations();
      showSnackbar('Logged in successfully', 'success');
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Login failed', 'error');
    }
  };

  // Handle signup with email/password
  const handleEmailSignup = async () => {
    try {
      const response = await axios.post('https://react-zlhw.onrender.com/auth/signup', {
        name,
        email,
        password
      });
      
      localStorage.setItem('token', response.data.token);
      const decoded = jwt_decode(response.data.token);
      setUser(decoded);
      setAuthDialogOpen(false);
      fetchConversations();
      showSnackbar('Account created successfully', 'success');
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Signup failed', 'error');
    }
  };

  // Handle Google login
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        const userInfo = await axios.get(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          { headers: { Authorization: `Bearer ${response.access_token}` } }
        );
        
        const googleResponse = await axios.post('https://react-zlhw.onrender.com/auth/google', {
          token: response.access_token,
          email: userInfo.data.email,
          name: userInfo.data.name
        });
        
        localStorage.setItem('token', googleResponse.data.token);
        const decoded = jwt_decode(googleResponse.data.token);
        setUser(decoded);
        fetchConversations();
        showSnackbar('Logged in with Google', 'success');
      } catch (error) {
        showSnackbar('Google login failed', 'error');
      }
    },
    onError: () => {
      showSnackbar('Google login failed', 'error');
    },
    clientId: '461438608851-lvb7ba066s1qqf9lva7t4qmi714m69se.apps.googleusercontent.com'
  });

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setMessages([]);
    setConversations([]);
    setCurrentConversationId(null);
    handleMenuClose();
    showSnackbar('Logged out successfully', 'success');
  };

  // Fetch all conversations
  const fetchConversations = async () => {
    if (!user) return;
    
    try {
      const response = await axios.get('https://react-zlhw.onrender.com/conversations', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      showSnackbar('Failed to load conversation history', 'error');
    }
  };

  // Load a specific conversation
  const loadConversation = async (conversationId) => {
    if (!user) {
      setAuthDialogOpen(true);
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await axios.get(`https://react-zlhw.onrender.com/${conversationId}/messages`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const formattedMessages = response.data.map(msg => ({
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
    event.stopPropagation();
    if (!user) return;
    
    try {
      await axios.delete(`https://react-zlhw.onrender.com/${conversationId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (currentConversationId === conversationId) {
        startNewConversation();
      }
      
      await fetchConversations();
      showSnackbar('Conversation deleted', 'success');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      showSnackbar('Failed to delete conversation', 'error');
    }
  };

  // Start a new conversation
  const startNewConversation = () => {
    if (!user) {
      setAuthDialogOpen(true);
      return;
    }
    
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
    
    if (!user) {
      setAuthDialogOpen(true);
      return;
    }

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
      const response = await axios.post('https://react-zlhw.onrender.com/chat', {
        message: input,
        conversation_id: currentConversationId || undefined
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const assistantMessage = {
        id: Date.now().toString(),
        content: response.data.response,
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (!currentConversationId) {
        setCurrentConversationId(response.data.conversation_id);
        await fetchConversations();
      } else {
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
            
            {user ? (
              <>
                <IconButton
                  size="large"
                  edge="end"
                  color="inherit"
                  onClick={handleMenuOpen}
                >
                  <AccountCircle />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem disabled>{user.name || user.email}</MenuItem>
                  <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </Menu>
              </>
            ) : (
              <Button 
                color="inherit"
                onClick={() => setAuthDialogOpen(true)}
              >
                Login
              </Button>
            )}
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

        {user ? (
          <>
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
          </>
        ) : (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            p: 4
          }}>
            <Typography variant="h5" gutterBottom>
              Welcome to Gemini Chat
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Please sign in to start chatting with the AI assistant
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              onClick={() => setAuthDialogOpen(true)}
              sx={{ mb: 2 }}
            >
              Sign In
            </Button>
          </Box>
        )}
      </ChatContainer>

      {/* Authentication Dialog */}
      <Dialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)}>
        <DialogTitle>{authMode === 'login' ? 'Sign In' : 'Create Account'}</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          {authMode === 'signup' && (
            <TextField
              autoFocus
              margin="dense"
              label="Name"
              type="text"
              fullWidth
              variant="outlined"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3 }}
          />
          
          <Button
            fullWidth
            variant="contained"
            onClick={authMode === 'login' ? handleEmailLogin : handleEmailSignup}
            sx={{ mb: 2 }}
          >
            {authMode === 'login' ? 'Sign In' : 'Sign Up'}
          </Button>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => handleGoogleLogin()}
              startIcon={<img src="https://www.google.com/favicon.ico" alt="Google" width={20} />}
            >
              Continue with Google
            </Button>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="body2" align="center">
            {authMode === 'login' ? (
              <>Don't have an account? <Button onClick={() => setAuthMode('signup')}>Sign up</Button></>
            ) : (
              <>Already have an account? <Button onClick={() => setAuthMode('login')}>Sign in</Button></>
            )}
          </Typography>
        </DialogContent>
      </Dialog>

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