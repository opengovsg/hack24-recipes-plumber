import { type CorsOptions } from 'cors'

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost')) {
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
