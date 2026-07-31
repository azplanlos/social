const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  console.log("register proxy");

  // API-Endpunkte an das Spring Boot Backend weiterleiten
  app.use(createProxyMiddleware({
    pathFilter: ['/beitrag', '/beitraege', '/foto', '/users', '/user', '/account',
                 '/conversations', '/contactlists', '/notifications', '/push',
                 '/stories', '/story', '/statistiken', '/chat'],
    target: 'http://localhost:8080',
    changeOrigin: true
  }));

  app.use(createProxyMiddleware({
    pathFilter: '/social',
    target: 'http://localhost:9000',
    changeOrigin: true
  }));

  app.use(createProxyMiddleware({
    pathFilter: '/realms',
    target: 'http://localhost:8082',
    changeOrigin: false,
    on: {
      proxyReq: (proxyReq, req) => {
        const host = req.headers.host || 'localhost:3000';
        proxyReq.setHeader('X-Forwarded-Host', host);
        proxyReq.setHeader('X-Forwarded-Port', host.split(':')[1] || '80');
        proxyReq.setHeader('X-Forwarded-Proto', 'http');
      }
    }
  }));

  app.use(createProxyMiddleware({
    pathFilter: '/resources',
    target: 'http://localhost:8082',
    changeOrigin: false,
    on: {
      proxyReq: (proxyReq, req) => {
        const host = req.headers.host || 'localhost:3000';
        proxyReq.setHeader('X-Forwarded-Host', host);
        proxyReq.setHeader('X-Forwarded-Port', host.split(':')[1] || '80');
        proxyReq.setHeader('X-Forwarded-Proto', 'http');
      }
    }
  }));
};
