import { Manrope, Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import ProvedorTransiciones from "./componentes/ProvedorTransiciones"

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"]
})

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "700"]
})

export const metadata = {
  title: "CyberLab",
  description: "Plataforma de entrenamiento práctico en ciberseguridad y pentesting"
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      translate="no"
      className={`${manrope.variable} ${inter.variable} ${jetbrainsMono.variable} h-full`}
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
