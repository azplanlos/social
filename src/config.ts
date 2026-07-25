// Zentrale Konfiguration – Werte kommen aus Environment-Variablen (Build-Zeit)
// Lokal: .env.local setzen, Produktion: via GitHub Actions beim Build injiziert

export const config = {
  apiUrl: process.env.REACT_APP_API_URL || '',
  assetsUrl: process.env.REACT_APP_ASSETS_URL || '/social',
  oidc: {
    authority: process.env.REACT_APP_OIDC_AUTHORITY || 'http://localhost:8082/realms/social',
    clientId: process.env.REACT_APP_OIDC_CLIENT_ID || 'social',
    redirectPath: '/login/oauth2/code/callback',
    scope: 'openid profile email',
  },
};
