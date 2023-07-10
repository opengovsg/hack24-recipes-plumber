import { deleteAuthCookie } from '@/helpers/cookie'
import Context from '@/types/express/context'

const logout = async (
  _parent: unknown,
  _params: unknown,
  context: Context,
): Promise<boolean> => {
  deleteAuthCookie(context.res)
  return true
}

export default logout