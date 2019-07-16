import store from './store'
import KuzzleDocuments from './components/KuzzleDocuments'
import KuzzleDocument from './components/KuzzleDocument'

export default {
  install(Vue, options = {}) {

    const config = {
      components: true,
      jwtStorageKey: 'jwt',
      port: 7512,
      server: 'localhost',
      ssl: false,
      storeModuleName: 'kuzzle',
      ...options
    }

    const {
      WebSocket,
      Kuzzle
    } = require('kuzzle-sdk')

    const kuzzle = new Kuzzle(
      new WebSocket(config.server, {
        port: config.port,
        sslConnection: config.ssl
      })
    )

    const events = config.events || {}

    for (let event in events) {
      if (event !== 'connectionError') {
        kuzzle.on(event, events[event])
      }
    }

    const connect = async () => {
      try {
        await kuzzle.connect()
        Vue.prototype._kuzzle_is_connected = true
      } catch (error) {
        if (events.connectionError) {
          events.connectionError(error)
        }
      }
    }

    Vue.prototype._kuzzle_is_connected = false
    
    connect()

    Vue.prototype.$kuzzle = kuzzle
    Vue.prototype._kuzzle_default_index = config.defaultIndex
    Vue.prototype._kuzzle_jwt_storage_key = config.jwtStorageKey

    if (config.store) {
      try {
        config.store.registerModule(config.storeModuleName, store(Vue))
      } catch (e) {
        throw e
      }
    }

    if (config.components) {
      Vue.component('kuzzle-documents', KuzzleDocuments)
      Vue.component('kuzzle-document', KuzzleDocument)
    }
  }
}
