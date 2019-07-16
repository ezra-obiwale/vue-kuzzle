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
      kuzzle.on(event, events[event])
    }


    Vue.prototype._kuzzle_is_connected = false
    Vue.prototype.$kuzzle = kuzzle
    Vue.prototype._kuzzle_default_index = config.defaultIndex
    Vue.prototype._kuzzle_jwt_storage_key = config.jwtStorageKey

    const timestamp = Date.now()

    if (config.store) {
      try {
        config.store.registerModule(config.storeModuleName, store(Vue, timestamp))
      } catch (e) {
        throw e
      }
    }

    if (config.components) {
      Vue.component('kuzzle-documents', KuzzleDocuments)
      Vue.component('kuzzle-document', KuzzleDocument)
    }

    kuzzle.on('connected', () => {
      config.store.commit(`${config.storeModuleName}/CONNECTED`, timestamp)
    })

    kuzzle.on('networkError', error => {
      config.store.commit(`${config.storeModuleName}/CONNECTION_ERROR`, { stamp: timestamp, error })
    })

    kuzzle.on('reconnected', () => {
      config.store.commit(`${config.storeModuleName}/CONNECTED`, timestamp)
    })

    kuzzle.on('diconnected', error => {
      config.store.commit(`${config.storeModuleName}/CONNECTION_ERROR`, { stamp: timestamp, error })
    })

    const connect = async () => {
      try {
        await kuzzle.connect()
        Vue.prototype._kuzzle_is_connected = true
      } catch (error) {
        config.store.commit(`${config.storeModuleName}/CONNECTION_ERROR`, { error, stamp: timestamp })
      }
    }

    connect()
  }
}
