import * as functions from 'firebase-functions'

import { setUserPost } from '../api/users/setUserPost'

import { failureLog } from '../helpers/failureLog'
import { getEventData } from '../helpers/getEventData'

export = functions.firestore.document('posts/{postId}').onCreate((event) => {
  const post = getEventData(event)

  const {postId} = event.params

  return Promise.all([
    post.ownerId &&
    setUserPost(post.owner.uid, postId, post)
  ]).catch((err) => {
    return failureLog(err)
  })
})
