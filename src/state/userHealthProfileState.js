import { reactive } from 'vue'

const USER_HEALTH_PROFILE_KEY = 'flame_sport_pheno_user_health_profile'

function readStoredProfile() {
  try {
    const rawProfile = window.localStorage.getItem(USER_HEALTH_PROFILE_KEY)
    return rawProfile ? JSON.parse(rawProfile) : null
  } catch {
    return null
  }
}

function writeStoredProfile(profile) {
  try {
    window.localStorage.setItem(USER_HEALTH_PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // localStorage 不可用时保留内存状态即可。
  }
}

const storedProfile = readStoredProfile()

export const userHealthProfileState = reactive({
  profile: storedProfile,
  completion: null,
  completionError: null,
  shouldCollectProfile: false
})

export function setUserHealthProfileCompletion(completion) {
  const normalizedCompletion = {
    isComplete: Boolean(completion?.isComplete),
    heightCmCompleted: Boolean(completion?.heightCmCompleted),
    missingFields: Array.isArray(completion?.missingFields) ? completion.missingFields : []
  }

  userHealthProfileState.completion = normalizedCompletion
  userHealthProfileState.completionError = null
  userHealthProfileState.shouldCollectProfile = !normalizedCompletion.isComplete && normalizedCompletion.missingFields.length > 0
}

export function setUserHealthProfileCompletionError(error) {
  userHealthProfileState.completionError = error
  userHealthProfileState.shouldCollectProfile = false
}

export function saveUserHealthProfile(profile) {
  const normalizedProfile = {
    ...(userHealthProfileState.profile || {}),
    collectedAt: new Date().toISOString()
  }

  if (Object.prototype.hasOwnProperty.call(profile, 'heightCm')) {
    normalizedProfile.heightCm = Number(Number(profile.heightCm).toFixed(2))
  }

  if (Object.prototype.hasOwnProperty.call(profile, 'age')) {
    normalizedProfile.age = Number(profile.age)
  }

  userHealthProfileState.profile = normalizedProfile
  userHealthProfileState.shouldCollectProfile = false
  writeStoredProfile(normalizedProfile)

  return normalizedProfile
}
