import { Failure, Success } from '../dto/dto.js'
import Workspace from '../models/Workspace.js'

const createWorkspace = async (request, response) => {
  try {
    const { user } = request
    const workspaceData = request.body
    const existWS = await Workspace.findOne(workspaceData)
    if (existWS) {
      return Failure(response, 400, 'workspace with same name already exists')
    }
    workspaceData.createdby = user.username
    const { workspaceid } = await Workspace.create(workspaceData)
    return Success(response, 200, { workspaceid })
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const getWorkspaces = async (request, response) => {
  try {
    const { workspaceid } = request.params
    if (workspaceid) {
      const result = await Workspace.findById(workspaceid, '-_id -__v')
        .populate('projects', '-_id -__v')
        .exec()
      return Success(response, 200, result)
    }
    const results = await Workspace.find()
      .select('-_id -__v -projects')
      .exec()
    return Success(response, 200, results)
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const deleteWorkspace = async (request, response) => {
  try {
    const { workspaceid } = request.params
    const workspace = await Workspace.findById(workspaceid, '-_id -__v')
    if (!workspace) {
      return Failure(response, 404, 'No matching workspace found')
    }
    await Workspace.findByIdAndDelete(workspaceid)
    return Success(response, 200, workspace)
  } catch (error) {
    return Failure(response, 500, error)
  }
}

export default {
  createWorkspace,
  getWorkspaces,
  deleteWorkspace
}
