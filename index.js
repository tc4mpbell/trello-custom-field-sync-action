const core = require("@actions/core")
const github = require("@actions/github")
const {
  getCards,
  getCustomField,
  getCardCustomItemFields,
  updateCustomField,
} = require("./trelloRequests")
const { getHeadCommitShaForPR, getCommitsFromMaster, getHeadRefForPR } = require("./githubRequests")
const { log } = require("./utils/log")
const { exec } = require("./utils/exec")

async function run() {
  // try {
  process.chdir(process.env.GITHUB_WORKSPACE)
  // } catch (error) {
  //   log("Error setting up git")
  //   log(error)
  //   core.setFailed(`Error setting up git ${error.message}`)
  // }

  try {
    // const commits = await findCommitsFromShaToMaster()
    const stagingCustomFieldItem = await getStagingCustomFieldItem()
    const cardsWithPRAttached = await getCardsWithPRAttached()

    cardsWithPRAttached.forEach(async (card, i) => {
      setCardCustomFieldValue({
        card,
        // commits,
        customFieldItem: stagingCustomFieldItem,
        i,
      })
    })
  } catch (error) {
    log(error)
    core.setFailed(error.message)
  }
}

run()

async function getCardsWithPRAttached() {
  const cards = await getCards()
  return cards.filter((card) => card.attachments.some(isPullRequestAttachment))
}

async function getStagingCustomFieldItem() {
  const customField = await getCustomField()
  return customField.options.find(
    (option) => Object.values(option.value)[0] === core.getInput("trello_custom_field_value"),
  )
}

async function setCardCustomFieldValue({ card, commits, customFieldItem, i }) {
  const attachments = card.attachments.filter(isPullRequestAttachment)
  const attachment = attachments[0] // TODO: support multiple PR attachments
  const prId = attachment.url.split("/").pop()
  const headCommitSha = await getHeadCommitShaForPR(prId)
  const headRef = await getHeadRefForPR(prId)
  if (i === 0) {
    const commitIsMerged = await checkIfCommitIsMerged(headRef, headCommitSha)
  }
  // const attachmentIsAMatchedPR = commits.some((commit) => commit.sha === headCommitSha)

  // temporarily disable
  // if (attachmentIsAMatchedPR) {
  //   return await addCustomFieldItemToCard({ card, customFieldItem })
  // } else {
  //   return await removeCustomFieldItemFromCard({ card, customFieldItem })
  // }
}

async function addCustomFieldItemToCard({ card, customFieldItem }) {
  const customFieldItems = await getCardCustomItemFields(card)
  const alreadyHasEnvironmentSet = customFieldItems.some(
    ({ idCustomField }) => customFieldItem.idCustomField === idCustomField,
  )
  if (alreadyHasEnvironmentSet) return

  const body = { idValue: customFieldItem.id }
  log(`adding ${card.name}`)
  return await updateCustomField({ card, customFieldItem, body })
}

async function removeCustomFieldItemFromCard({ card, customFieldItem }) {
  if (core.getInput("add_only") !== "false") return

  const customFieldItems = await getCardCustomItemFields(card)
  const customFieldItemSetToCustomFieldItemValue = customFieldItems.some(
    ({ idValue }) => idValue === customFieldItem.id,
  )
  if (!customFieldItemSetToCustomFieldItemValue) return

  const body = { idValue: "", value: "" }
  log(`removing ${card.name}`)
  return await updateCustomField({ card, customFieldItem, body })
}

// we only get 250 per page so we will iterate over pages to grab more if there is more
async function findCommitsFromShaToMaster() {
  const { commits, total_commits } = await getCommitsFromMaster()
  let allCommits = commits
  const extraPagesCount = Math.min(Math.floor(total_commits / 250), 5) // let's cap at 1500 commits
  for (let index = 0; index < extraPagesCount; index++) {
    const page = index + 2 // we already loaded page 1
    const { commits: pageCommits } = await getCommitsFromMaster({ page })
    allCommits = [...allCommits, ...pageCommits]
  }

  return allCommits
}

function isPullRequestAttachment(attachment) {
  const owner = github.context.payload.repository.owner.name
  const repo = github.context.payload.repository.name
  return attachment.url.includes(`github.com/${owner}/${repo}/pull`)
}

async function checkIfCommitIsMerged(ref, sha) {
  const baseRef = github.context.ref.replace("refs/heads/", "")
  try {
    try {
      await exec(`git checkout ${ref}`)
    } catch (e) {
      log(`${ref} is no longer a valid branch`)
      // return
    }
    const { output: ancestorHash, error, exitCode } = await exec(
      `git merge-base origin/${baseRef} ${sha}`,
    )
    log({ ancestorHash, error, exitCode })
    // const { output: treeId } = await exec(`git rev-parse origin/${ref}^{tree}`)
    // const { output: danglingCommitId } = await exec(
    //   `git commit-tree ${treeId} -p ${ancestorHash} -m Temp commit for ${ref}`,
    // )
    // const { output } = await exec(`git cherry origin/${baseRef} ${danglingCommitId}`)
    log({ ancestorHash /*treeId, danglingCommitId, output*/ })
    // return output.startsWith("-")
  } catch (e) {
    log(`ERROR: ${e}`)
  }
}
