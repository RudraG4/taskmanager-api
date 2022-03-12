import express from 'express'
import workspaceService from '../services/workspaceService.js'

const workspace = express.Router()

workspace.post('/', workspaceService.createWorkspace)

workspace.get('/', workspaceService.getWorkspaces)

workspace.get('/:workspaceid', workspaceService.getWorkspaces)

workspace.delete('/:workspaceid', workspaceService.deleteWorkspace)

workspace.post('/:workspaceid/projects', workspaceService.createProject)

workspace.get('/:workspaceid/projects', workspaceService.getProjects)

workspace.get('/:workspaceid/projects/:projectid', workspaceService.getProjects)

workspace.delete('/:workspaceid/projects/:projectid', workspaceService.deleteProject)

export default workspace
