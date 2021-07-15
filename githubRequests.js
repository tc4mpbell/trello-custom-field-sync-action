const core = require("@actions/core")
const github = require("@actions/github")

exports.getHeadCommitShaForPR = async function getHeadCommitShaForPR(id) {
  const owner = github.context.payload.repository.owner.name
  const repo = github.context.payload.repository.name
  const {
    data: {
      head: { sha },
    },
  } = await getOctokit().request(`GET /repos/${owner}/${repo}/pulls/${id}`)
  return sha
}

exports.getCommitsFromMaster = async function (options = {}) {
  const currentSha = github.context.sha
  const basehead = `master...${currentSha}`
  const owner = github.context.payload.repository.owner.name
  const repo = github.context.payload.repository.name
  const { data } = await getOctokit().request(
    `GET /repos/${owner}/${repo}/compare/${basehead}`,
    options,
  )

  return data
}

function getOctokit() {
  const githubToken = core.getInput("github_token")
  return github.getOctokit(githubToken)
}

exports.getHeadRefForPR = async function getHeadRefForPR(id) {
  const owner = github.context.payload.repository.owner.name
  const repo = github.context.payload.repository.name
  const {
    data: {
      head: { ref },
    },
  } = await getOctokit().request(`GET /repos/${owner}/${repo}/pulls/${id}`)
  return ref
}
