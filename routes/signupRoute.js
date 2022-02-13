import express from 'express'
import * as userService from '../services/userService.js'

const router = express.Router()

router.post('/signup', userService.signup)

export default router
