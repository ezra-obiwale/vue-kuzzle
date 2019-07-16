import * as mutations from './mutations'

let timestamp = null

export default stamp => {
  timestamp = stamp

  return mutations
}

// User
export const SET_CURRENT_USER = (state, user) => {
  state.currentUser = user
}

export const UNSET_CURRENT_USER = state => {
  state.currentUser = null
}

export const SET_USER_LOCALE = (state, locale) => {
  if (!state.currentUser || !state.currentUser.content) {
    return
  }
  if (!locale) {
    return
  }

  state.currentUser.content.locale = locale
}

// Connection

export const CONNECTED = (state, stamp) => {
  if (stamp === timestamp) {
    state.connected = true
    state.connectionError = null
  }
}

export const CONNECTION_ERROR = (state, { stamp, error }) => {
  if (stamp === timestamp) {
    state.connectionError = error
    state.connected = false
  }
}

// Documents

export const SET_COLLECTION = (state, collection) => {
  if (!collection || state.collection === collection) {
    return
  }
  state.collection = collection
  state.documents = []
  state.document = null
  state.lastResult = null
}

export const SET_INDEX = (state, index) => {
  if (!index || state.index === index) {
    return
  }
  state.index = index
  state.documents = []
  state.document = null
  state.lastResult = null
}

export const SET_DOCUMENTS = (state, documents) => {
  if (!state.lastResult) {
    state.lastResult = documents
  }
  state.documents = [...state.documents, ...documents.hits]
  state.documentsCount = documents.total
  state.documentsFetched = documents.fetched
}

export const SET_CURRENT_DOCUMENT = (state, document) => {
  state.currentDocument = document
}

export const ADD_DOCUMENT = (state, {
  index,
  collection,
  document
}) => {
  if (state.index !== index || state.collection !== collection) {
    return
  }

  state.documents.unshift(document)
}

export const UPDATE_DOCUMENT = (state, {
  index,
  collection,
  document
}) => {
  if (state.index !== index || state.collection !== collection) {
    return
  }

  const loc = state.documents.findIndex(doc => doc._id === document._id)
  if (loc > -1) {
    state.documents.splice(loc, 1, document)
  }
}

export const REMOVE_DOCUMENT = (state, { index, collection, id }) => {
  if (state.index !== index || state.collection !== collection) {
    return
  }

  const loc = state.documents.findIndex(doc => doc._id === id)
  if (loc > -1) {
    state.documents.splice(loc, 1)
    state.documentsFetched--
    state.documentsCount--
  }
}

export const RESET_DOCUMENTS = state => {
  state.documents = []
  state.document = null
}

export const RESET = state => {
  SET_INDEX(state, null)
  SET_COLLECTION(state, null)
}

export const NOTIFICATION_RECEIVED = (state, {
  action,
  index,
  collection,
  result
}) => {
  switch (action) {
    case 'update':
      if (result._source.$deleted_at) {
        REMOVE_DOCUMENT(state, { index, collection, id: result._id })
      } else {
        UPDATE_DOCUMENT(state, { index, collection, document: result })
      }
      break
    case 'delete':
      REMOVE_DOCUMENT(state, { index, collection, id: result._id })
      break
    case 'create':
      if (result._meta.author === state.currentUser._id) {
        ADD_DOCUMENT(state, { index, collection, document: result })
      }
      break
  }
}
