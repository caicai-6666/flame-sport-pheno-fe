import request from './request'

function toUserProfilePayload(profile) {
  const payload = {}

  if (Object.prototype.hasOwnProperty.call(profile, 'heightCm')) {
    payload.height_cm = Number(Number(profile.heightCm).toFixed(2))
  }

  if (Object.prototype.hasOwnProperty.call(profile, 'age')) {
    payload.age = Number(profile.age)
  }

  return payload
}

export async function updateUserProfile(profile) {
  return request.post('/user/profile', toUserProfilePayload(profile))
}
