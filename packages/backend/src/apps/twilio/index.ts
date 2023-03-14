import defineApp from '../../helpers/define-app'

import addAuthHeader from './common/add-auth-header'
import actions from './actions'
import auth from './auth'
import triggers from './triggers'

export default defineApp({
  name: 'Twilio',
  key: 'twilio',
  iconUrl: '{BASE_URL}/apps/twilio/assets/favicon.svg',
  authDocUrl: 'https://automatisch.io/docs/apps/twilio/connection',
  supportsConnections: true,
  baseUrl: 'https://twilio.com',
  apiBaseUrl: 'https://api.twilio.com',
  primaryColor: 'e1000f',
  beforeRequest: [addAuthHeader],
  auth,
  triggers,
  actions,
})
