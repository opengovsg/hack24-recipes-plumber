import { check } from 'k6'
import http from 'k6/http'

export const options = {
  vus: 20,
  duration: '30s',
}
export default function () {
  const payload = JSON.stringify({
    data: {
      attachmentDownloadUrls: {},
      created: '2023-04-14T03:26:19.935Z',
      encryptedContent: 'xxx',
      formId: '641ae1183ebf3b00122f1e0b',
      submissionId: '6438c7dbe0a0d70012598754',
      version: 1,
    },
  })
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-formsg-signature': 'xxx',
    },
  }
  const webhook = http.post(
    'https://staging.plumber.gov.sg/webhooks/xxx',
    payload,
    params,
  )
  check(webhook, 'is accepted', (r) => r.status === 200)
}