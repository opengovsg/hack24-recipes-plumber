import type { RequestHandler } from 'express'
import z from 'zod'

import { getOrCreateUser } from '@/helpers/auth'
import { validateAndParseEmail } from '@/helpers/email-validator'

const paramsSchema = z.object({
  userEmail: z.string().email().min(1),
  tileName: z.string().min(1),
  columns: z.array(z.string().min(1)).min(1),
})

const createTileHandler: RequestHandler = async function (req, res) {
  const params = paramsSchema.parse(req.body)

  // Create user if doesn't already exist.
  const email = await validateAndParseEmail(params.userEmail)
  if (!email) {
    throw new Error('Email is invalid or not whitelisted.')
  }
  const user = await getOrCreateUser(email)

  const tile = await user.$relatedQuery('tables').insertGraph({
    name: params.tileName,
    role: 'owner',
    columns: params.columns.map((name, position) => ({ name, position })),
  })

  res.json({
    tileId: tile.id,
    columns: tile.columns.map((column) => ({
      id: column.id,
      name: column.name,
    })),
  })
}

export default createTileHandler
