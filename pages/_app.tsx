// pages/_app.tsx
import type { AppProps } from 'next/app';

import '@/styles/globals.css';         // your Tailwind/global styles
import 'reactflow/dist/style.css';     // React Flow v11 stylesheet

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}