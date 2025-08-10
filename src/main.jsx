import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { CssVarsProvider, extendTheme } from '@mui/material/styles'
import { experimental_extendTheme as extendMuiTheme } from '@mui/material/styles'
import { deepPurple, indigo, pink } from '@mui/material/colors'

const muiTheme = extendMuiTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: indigo[600],
        },
        secondary: {
          main: pink[600],
        },
      },
    },
    dark: {
      palette: {
        primary: {
          main: deepPurple[500],
        },
        secondary: {
          main: pink[400],
        },
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CssVarsProvider theme={muiTheme}>
      <App />
    </CssVarsProvider>
  </React.StrictMode>
)