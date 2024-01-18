import { Router } from 'express'

import graphQLInstance from '@/helpers/graphql-instance'

import recipesRouter from './recipes'
import webhooksRouter from './webhooks'

const router = Router()

router.use('/graphql', graphQLInstance)
router.use('/webhooks', webhooksRouter)
router.use('/recipes', recipesRouter)

export default router
