export const currentDocument = state => {
  return state.currentDocument ? {
    _id: state.currentDocument._id,
    ...state.currentDocument._source
  } : null
}

export const currentUser = state => {
  return state.currentUser
}

export const documents = state => {
  return state.documents.map(doc => {
    return {
      _id: doc._id,
      ...doc._source,
      ...doc.content
    }
  })
}

export const documentsFetched = state => {
  return state.documentsFetched
}

export const documentsTotal = state => {
  return state.documentsTotal
}

export const index = state => {
  return state.index
}
