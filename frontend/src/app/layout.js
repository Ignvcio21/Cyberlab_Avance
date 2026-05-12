import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import ProvedorTransiciones from "./componentes/ProvedorTransiciones"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
})

export const metadata = {
  title: "CyberLab",
  description: "Plataforma web de entrenamiento práctico en ciberseguridad"
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      translate="no"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="min-h-full flex flex-col">
        <ProvedorTransiciones>{children}</ProvedorTransiciones>
      </body>
    </html>
  )
}