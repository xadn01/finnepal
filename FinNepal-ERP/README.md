# FinNepal ERP

A modern, web-based, multi-tenant accounting software tailored for the Nepalese market, with complete IRD.gov.np integration, real-time dashboards, financial reports, and VAT billing support.

## Features

- 🔐 Multi-tenant authentication with Firebase
- 📊 Real-time financial dashboards
- 🧾 IRD-compliant VAT invoicing
- 🛒 Sales and purchase management
- 🧮 Complete accounting system
- 📈 Comprehensive financial reports
- 🌐 Bilingual support (Nepali/English)
- 📱 Responsive design

## Tech Stack

- Frontend: React + TypeScript + Vite
- UI: Tailwind CSS + DaisyUI
- Backend: Firebase (Auth, Firestore, Storage)
- Charts: Recharts
- I18n: React-i18next

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account
- Firebase CLI (for deployment)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/finnepal-erp.git
cd finnepal-erp
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. Start the development server:
```bash
npm run dev
```

## Deployment

1. Build the project:
```bash
npm run build
```

2. Deploy to Firebase:
```bash
firebase login
firebase init
firebase deploy
```

## Project Structure

```
src/
├── assets/         # Static assets
├── components/     # Reusable components
├── contexts/       # React contexts
├── i18n/           # Translation files
├── layouts/        # Layout components
├── pages/          # Page components
├── services/       # API and Firebase services
└── utils/          # Utility functions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@finnepal.com or join our Slack channel. 