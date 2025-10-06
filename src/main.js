import React from 'react';
import { createRoot } from 'react-dom/client';

// Simple test component first
const App = () => {
  return React.createElement('div', { className: 'flex h-screen bg-gray-50' },
    React.createElement('div', { className: 'flex-1 flex items-center justify-center' },
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'text-8xl mb-6' }, '📚'),
        React.createElement('h1', { className: 'text-4xl font-bold text-gray-800 mb-4' }, 'Scroll Warden'),
        React.createElement('p', { className: 'text-xl text-gray-600' }, 'Application is loading...')
      )
    )
  );
};

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(React.createElement(App));
