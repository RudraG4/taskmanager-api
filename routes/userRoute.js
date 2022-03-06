import * as userService from '../services/userService.js'
import express from 'express'

const router = express.Router()

router.get('/:username', userService.findUser)

export default router
