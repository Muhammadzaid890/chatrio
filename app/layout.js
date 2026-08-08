export const metadata = {
  title: 'Chatrio by Zaid',
  description: 'Real-time Messaging and Calling Web App',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}