import { IRequest } from '@plumber/types'

import { NextFunction, RequestHandler, Response, Router } from 'express'
import multer from 'multer'

import { createPipeHandler, createTileHandler } from '@/controllers/recipes'
import logger from '@/helpers/logger'

const router = Router()
const upload = multer()

router.use(upload.none())

function exposeError(handler: RequestHandler) {
  return async (req: IRequest, res: Response, next: NextFunction) => {
    try {
      logger.http({
        webhookUrl: req.url,
        body: req.body,
        headers: req.headers,
      })
      await handler(req, res, next)
    } catch (err) {
      logger.error(err)
      next(err)
    }
  }
}

router.post('/pipes/create', exposeError(createPipeHandler))
router.post('/tiles/create', exposeError(createTileHandler))

export default router
