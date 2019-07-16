import state from './state'
import * as getters from './getters'
import mutations from './mutations'
import actions from './actions'

export default (Vue, timestamp) => {
  return {
    namespaced: true,
    state,
    getters,
    mutations: mutations(timestamp),
    actions: actions(Vue)
  }
}
