import NodeCache from 'node-cache'

const nodeCache = new NodeCache({ stdTTL: 60, checkperiod: 60 })

export default nodeCache
