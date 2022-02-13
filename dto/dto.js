import _ from 'lodash'

export const Success = (response, status = 200, result) => {
  const body = { status: 'success' }
  if (result) {
    if (_.isArray(result)) {
      body.results = result
    } else {
      body.result = result
    }
  }
  return response.status(200).json(body)
}

export const Failure = (response, status = 500, error) => {
  const body = {
    status: 'failure',
    error: error || 'Internal Server Error'
  }
  if (error instanceof Error) {
    body.error = error.message
  }
  return response.status(status).json(body)
}
