import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "@tailwindcss/vite"
import fs from "fs"
import https from "https"

// Check if HTTPS certificates exist
const keyPath = "/data/https/server.key"
const certPath = "/data/https/server.crt"
const httpsEnabled = fs.existsSync(keyPath) && fs.existsSync(certPath)

// Allow configuring backend port via environment variable
const backendPort = process.env.VITE_BACKEND_PORT || "5054"
const backendUrl = httpsEnabled ? `https://localhost:${backendPort}` : `http://localhost:${backendPort}`

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		tailwindcss(),
		react()
	],
	server: {
		host: true,
		...(httpsEnabled && {
			https: {
				key: fs.readFileSync(keyPath),
				cert: fs.readFileSync(certPath)
			}
		}),
		proxy: {
			"/api": {
				target: backendUrl,
				changeOrigin: true,
				...(httpsEnabled && {
					secure: false,
					agent: new https.Agent({
						rejectUnauthorized: false
					})
				}),
				ws: true,
				// configure: (proxy, _options) => {
				//   proxy.on('error', (err, _req, _res) => {
				//     console.log('proxy error', err);
				//   });
				//   proxy.on('proxyReq', (proxyReq, req, _res) => {
				//     console.log('Sending Request to the Target:', req.method, req.url);
				//   });
				//   proxy.on('proxyRes', (proxyRes, req, _res) => {
				//     console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
				//   });
				// },
			},
			"/notificationHub": {
				target: backendUrl,
				changeOrigin: true,
				ws: true,
				...(httpsEnabled && {
					agent: new https.Agent({
						rejectUnauthorized: false
					})
				}),
			}
		}
	}
})
