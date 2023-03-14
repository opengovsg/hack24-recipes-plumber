import defineApp from '../../helpers/define-app'

import addAuthHeader from './common/add-auth-header'
import actions from './actions'
import auth from './auth'
import dynamicData from './dynamic-data'
import triggers from './triggers'

export default defineApp({
  name: 'Github',
  key: 'github',
  baseUrl: 'https://github.com',
  apiBaseUrl: 'https://api.github.com',
  iconUrl: '{BASE_URL}/apps/github/assets/favicon.svg',
  authDocUrl: 'https://automatisch.io/docs/apps/github/connection',
  primaryColor: '000000',
  supportsConnections: true,
  beforeRequest: [addAuthHeader],
  auth,
  triggers,
  actions,
  dynamicData,
})
