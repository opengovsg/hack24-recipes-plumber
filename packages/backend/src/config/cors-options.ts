import { type CorsOptions } from 'cors'

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      origin.startsWith('http://localhost') ||
      origin.endsWith('.ngrok-free.app') ||
      origin.endsWith('.devtunnels.ms')
    ) {
      callback(null, true)
    } else {
      callback(new Error('not allowed by CORS'))
    }
  },
  methods: 'POST',
  credentials: true,
  optionsSuccessStatus: 200,
}

export default corsOptions
