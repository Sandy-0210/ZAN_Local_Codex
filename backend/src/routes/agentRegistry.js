const { getWorkspaceRoot } = require('../tools/paths')
const {
  hydrateAgentState,
  purgePending,
} = require('../agent/agentLoop')

let agentBrainPromise = null

function resetAgentBrain() {
  purgePending()
  agentBrainPromise = hydrateAgentState(getWorkspaceRoot())
  return agentBrainPromise
}

function getAgentBrain() {
  if (!agentBrainPromise) {
    agentBrainPromise = hydrateAgentState(getWorkspaceRoot())
  }
  return agentBrainPromise
}

module.exports = {
  resetAgentBrain,
  getAgentBrain,
}
