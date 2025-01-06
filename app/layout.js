import './globals.css'

export const metadata = {
  title: 'Tower of Hanoi',
  description: 'A puzzle game by Nik Dudukovic',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-900">{children}</body>
    </html>
  )
}
