import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';  // This import is correct, but we'll verify the file path

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
