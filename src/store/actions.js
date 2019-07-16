import * as actions from './actions'

let kuzzle = null
let jwtStorageKey = null
let defaultIndex = null

export default Vue => {
  kuzzle = Vue.prototype.$kuzzle
  jwtStorageKey = Vue.prototype._kuzzle_jwt_storage_key
  defaultIndex = Vue.prototype._kuzzle_default_index

  return actions
}

let subscriptionRoomId = null


const getIndex = (index, state) => {
  return index || state.index || defaultIndex
}

let filteredId = null

const subscribe = async (index, collection, {
  commit,
  state
}, id = null) => {
  if (state.index === getIndex(index, state) && state.collection === collection && filteredId === id) {
    return
  }
  unsubscribe()
  let filters = {}
  filteredId = id
  if (id) {
    filters.ids = {
      values: [id]
    }
  }
  subscriptionRoomId = await kuzzle.realtime.subscribe(getIndex(index, state), collection, filters, notification => {
    if (!notification.room.startsWith(subscriptionRoomId)) {
      return
    }
    commit('NOTIFICATION_RECEIVED', notification)
  })
}

const unsubscribe = () => {
  if (!subscriptionRoomId) {
    return
  }
  checkConnection(state)
  kuzzle.realtime.unsubscribe(subscriptionRoomId)
}

const checkConnection = state => {
  if (!state.connected) {
    throw new Error('Server not connected')
  }
}

// Auth
export const REGISTER = async ({
  state
}, user) => {
  checkConnection(state)
  const createdUser = await kuzzle.security.createUser(null, user)
  return createdUser
}

export const SEND_PASSWORD_RESET_EMAIL = async ({
  state
}, email) => {
  checkConnection(state)
}

export const LOGIN = async ({
  dispatch,
  state
}, credentials) => {
  checkConnection(state)
  try {
    const jwt = await kuzzle.auth.login('local', credentials, '7 days')
    localStorage.setItem(jwtStorageKey, jwt)
    const user = await dispatch('FETCH_CURRENT_USER')
    return user
  } catch (error) {
    localStorage.removeItem(jwtStorageKey)
    throw error
  }
}

export const CHECK_TOKEN = async ({
  dispatch,
  state
}) => {
  const jwt = localStorage.getItem(jwtStorageKey)

  if (!jwt) {
    return false
  }

  checkConnection(state)

  const {
    valid
  } = await kuzzle.auth.checkToken(jwt)

  if (!valid) {
    await dispatch('LOG_OUT')
    return false
  }

  kuzzle.jwt = jwt

  if (!state.currentUser) {
    await dispatch('FETCH_CURRENT_USER')
  }

  return true
}

export const FETCH_CURRENT_USER = async ({
  commit,
  state
}) => {
  checkConnection(state)
  const currentUser = await kuzzle.auth.getCurrentUser()
  commit('SET_CURRENT_USER', {
    ...currentUser
  })
  return currentUser
}

export const LOG_OUT = async ({
  commit
}) => {
  /**
   * You should tear down your session here.
   */
  commit('UNSET_CURRENT_USER')
  kuzzle.jwt = null
  localStorage.clear()

  return true
}

export const UPDATE_PASSWORD = async ({
  state
}, password) => {
  checkConnection(state)
  const creds = await kuzzle.auth.updateMyCredentials('local', {
    password
  })
  return creds
}

export const UPDATE_SELF = async ({
  commit,
  state
}, data) => {
  checkConnection(state)
  const user = await kuzzle.auth.updateSelf(data)
  commit('SET_CURRENT_USER', user)
  return user
}

export const UPDATE_USER = async ({
  state
}, {
  id,
  data
}) => {
  checkConnection(state)
  return kuzzle.security.updateUser(id, data)
}

export const SAVE_USER_LOCALE = async ({
  commit,
  state
}, locale) => {
  checkConnection(state)
  try {
    await kuzzle.auth.updateSelf({
      locale
    })
    commit('SET_USER_LOCALE', locale)
    return true
  } catch (error) {
    return false
  }
}

// Documents

export const FETCH_DOCUMENTS = async ({
  commit,
  state
}, {
  collection,
  index,
  query = {},
  refresh = false,
  size = 15
}) => {
  subscribe(index, collection, {
    commit,
    state
  })

  commit('SET_INDEX', index)
  commit('SET_COLLECTION', collection)

  checkConnection(state)
  if (!state.documents.length || refresh) {
    try {
      const documents = await kuzzle.document.search(getIndex(index, state), collection, query, {
        scroll: '1m',
        size
      })
      if (refresh) {
        commit('RESET_DOCUMENTS')
      }
      commit('SET_DOCUMENTS', documents)

      return documents
    } catch (error) {
      return false
    }
  }
}

export const FETCH_NEXT_DOCUMENTS = async ({
  commit,
  state
}) => {
  checkConnection(state)
  const documents = await state.lastResult.next()
  if (documents) {
    commit('SET_DOCUMENTS', documents)
    return documents
  }
  return {}
}

export const FETCH_A_DOCUMENT = async ({
  commit,
  state
}, {
  index,
  collection,
  id
}) => {
  let document

  if (state.index === index && state.collection === collection) {
    const index = state.documents.findIndex(doc => doc._id === id)
    if (index > -1) {
      document = state.documents[index]
    }
  }

  if (!document) {
    checkConnection(state)
    document = await kuzzle.document.get(index, collection, id)

    if (document) {
      subscribe(index, collection, {
        commit,
        state
      }, id)
    }
  }

  commit('SET_CURRENT_DOCUMENT', document)
  return document
}

export const SAVE_DOCUMENT = async ({
  state
}, {
  collection,
  index,
  document,
  id
}) => {
  checkConnection(state)
  if (!await kuzzle.document.validate(index, collection, document)) {
    throw new Error('Invalid document')
  }

  if (document._id) {
    delete document._id
    delete document._kuzzle_info
  }

  let result = await (
    id ?
    kuzzle.document.update(index, collection, id, document, {
      refresh: 'wait_for',
      retryOnConflict: 3
    }) :
    kuzzle.document.create(index, collection, document, null, {
      refresh: 'wait_for'
    })
  )

  return result
}

export const DELETE_DOCUMENT = async ({
  state,
  dispatch
}, {
  collection,
  index,
  id,
  permanently = false
}) => {
  checkConnection(state)

  let result
  let document = state.documents.find(doc => doc._id === id)

  if (!permanently && document) {
    document = document._source
    document.$deleted_at = await kuzzle.server.now()

    result = await dispatch('SAVE_DOCUMENT', {
      collection,
      index,
      id,
      document
    })
  }

  if (!result) {
    await kuzzle.document.delete(index, collection, id, {
      refresh: 'wait_for'
    })
    result = document
  }

  return result
}
