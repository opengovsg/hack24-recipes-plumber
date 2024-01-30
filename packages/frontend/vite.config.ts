import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import loadVersion from 'vite-plugin-package-version'
import viteTsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig({
  // loadVersion injects package.json version into import.meta.env.PACKAGE_VERSION
  plugins: [react(), viteTsconfigPaths(), loadVersion()],
  server: {
    open: 'http://localhost:13001',
    port: 13001,
    proxy: {
      '/graphql': {
        target: 'http://localhost:13000',
        changeOrigin: true,
        secure: false,
      },
      '/apps': {
        target: 'http://localhost:13000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
