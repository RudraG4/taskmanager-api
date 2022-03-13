import auth from '../services/authService.js'
import { Failure } from '../dto/dto.js'

export default async (request, response, next) => {
  try {
    const { authorization } = request.headers
    if (authorization && authorization.startsWith('Bearer') && authorization.split(' ').length === 2) {
      const token = authorization.split(' ')[1]
      const user = await auth.authenticate(token)
      if (user) {
        request.user = user
        next()
      } else {
        return Failure(response, 403, 'Unauthorized Client')
      }
    } else {
      return Failure(response, 401, 'Authorization failed! Please provide a valid token')
    }
  } catch (err) {
    return Failure(response, 500, err)
  }
}
