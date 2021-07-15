const core = require("@actions/core")
const github = require("@actions/github")
const { exec } = require("utils/exec")
const { log } = require("utils/log")

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
  const { output } = await exec(`git rev-list --ancestry-path ${basehead}`)
  const commitShas = output.split("\n").map((sha) => ({ sha, total_commits: 0 }))
  const owner = github.context.payload.repository.owner.name
  const repo = github.context.payload.repository.name
  const { data } = await getOctokit().request(
    `GET /repos/${owner}/${repo}/compare/${basehead}`,
    options,
  )

  log(commitShas, data)
  return data
}

function getOctokit() {
  const githubToken = core.getInput("github_token")
  return github.getOctokit(githubToken)
}
