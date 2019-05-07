const {
    Kuzzle,
    WebSocket
} = require('kuzzle-sdk');

export default {
    install: (Vue, options = {}) => {
        options = {
            namespace: 'kz',
            ...options
        }
        if (!options.server_url) {
            throw '"server_url" must be specified in the options'
        }

        const createMethod = name => {
            return `${options.namespace}${name}`
                .replace(/^[A-Z]/, alpha => {
                    return alpha.toLowerCase()
                })
        }

        Vue.mixin({
            beforeCreate() {
                if (this.$options.kuzzle) {
                    const conf = this.$options.kuzzle
                    if (!conf.collection) {
                        throw 'Kuzzle collection must be specified'
                    }

                    const kuzzle = new Kuzzle(
                        new WebSocket(options.server_url)
                    );
                    this.$kuzzle = kuzzle

                    if (conf.onNetworkError) {
                        kuzzle.on('networkError', conf.onNetworkError);
                    }

                    this[createMethod('Browse')] = function () {
                        kuzzle.dataCollectionFactory(conf.collection)
                            .search()
                    }

                }
            },
            beforeDestroy() {
                this.$kuzzle.disconnect()
            }
        })



    }
}