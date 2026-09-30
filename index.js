// Root entrypoint for Cloud hosting platforms (Render / Railway / Heroku)
process.on('uncaughtException', (err) => {
  console.error('CRITICAL UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

require('./server/index.js');
