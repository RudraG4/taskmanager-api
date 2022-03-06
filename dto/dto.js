import _ from 'lodash'

export const Success = (response, status = 200, result, links) => {
  const body = { status: 'success' }
  if (result) {
    if (_.isArray(result)) {
      body.results = result
    } else {
      body.result = result
    }
  }
  body._links = links
  return response.status(200).json(body)
}

export const Failure = (response, status = 500, error, links) => {
  const body = {
    status: 'failure',
    error: error || 'Internal Server Error'
  }
  if (error instanceof Error) {
    body.error = error.message
  }
  body._links = links
  return response.status(status).json(body)
}
