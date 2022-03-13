import express from 'express'
import authService from '../services/authService.js'

const router = express.Router()

router.post('/signup', authService.signup)

router.post('/signin', authService.signin)

router.post('/forgetpwd', authService.forgetpassword)

router.post('/resetpwd', authService.resetpassword)

export default router
