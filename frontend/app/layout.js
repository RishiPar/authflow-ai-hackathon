import './globals.css'

export const metadata = {
  title: 'AuthFlow AI - Patient Access Assistant',
  description: 'AI-Powered Prior Authorization and Denial Prevention Assistant',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  )
}
