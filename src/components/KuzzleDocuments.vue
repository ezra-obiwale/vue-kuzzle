<template>
  <div>
    <slot :documents="documents" :total="documentsCount" :working="working" />
  </div>
</template>

<script>
import { mapActions, mapGetters, mapState } from 'vuex'
export default {
  name: 'KuzzleDocumentsComponent',
  props: {
    collection: {
      type: String,
      required: true
    },
    filter: {
      type: Array,
      default: () => []
    },
    index: {
      type: String
    },
    noAutoload: {
      type: Boolean,
      default: false
    },
    query: {
      type: Object,
      default: () => ({})
    },
    search: {
      type: String,
      default: ''
    },
    size: {
      type: Number,
      default: 15
    },
    trashedOnly: {
      type: Boolean,
      default: false
    },
    withTrashed: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      loadingMore: false,
      working: false
    }
  },
  computed: {
    ...mapGetters('kuzzle', ['documents']),
    ...mapState('kuzzle', ['documentsCount']),
    compiledQuery () {
      let query = { ...this.query }
      this.prefillQuery(query)

      if (this.trashedOnly) {
        if (!query.query.bool.must) {
          query.query.bool.must = []
        }
        query.query.bool.must.push({
          exists: {
            field: '$deleted_at'
          }
        })
      } else if (!this.withTrashed) {
        if (!query.query.bool.must_not) {
          query.query.bool.must_not = []
        }
        query.query.bool.must_not.push({
          exists: {
            field: '$deleted_at'
          }
        })
      }

      if (this.filter.length) {
        if (!query.query.bool.filter) {
          query.query.bool.filter = []
        }
        query.query.bool.filter = [...this.filter, ...query.query.bool.filter]
      }
      if (this.search) {
        if (!query.query.bool.query_string) {
          query.query.bool.query_string = {}
        }
        query.query.bool.query_string.query = this.search
      }

      return query
    }
  },
  watch: {
    compiledQuery: {
      deep: true,
      handler (value) {
        this.load(() => {}, true)
      }
    },
    loadingMore (value) {
      this.$emit('loadingMore', value)
    },
    working (value) {
      this.$emit('working', value)
    }
  },
  created () {
    if (!this.noAutoload) {
      this.load()
    }
  },
  methods: {
    ...mapActions('kuzzle', ['FETCH_DOCUMENTS', 'FETCH_NEXT_DOCUMENTS', 'DELETE_DOCUMENT']),
    load (done = (() => {}), refresh = false) {
      this.working = true
      this.tryCatch(
        async () => {
          await this.FETCH_DOCUMENTS({
            collection: this.collection,
            index: this.index,
            query: this.compiledQuery,
            refresh,
            size: this.size
          })
          this.working = false
          done(this.documents, this.documentsCount)
        },
        () => {
          done()
          this.working = false
        }
      )
    },
    loadNext (done = (() => {})) {
      this.loadingMore = true
      this.tryCatch(
        async () => {
          await this.FETCH_NEXT_DOCUMENTS()
          this.loadingMore = false
          done(this.documents, this.documentsCount)
        },
        () => {
          done()
          this.loadingMore = false
        }
      )
    },
    prefillQuery (query) {
      if (!query.query) {
        query.query = {}
      }
      if (!query.query.bool) {
        query.query.bool = {}
      }
    },
    refresh (done) {
      this.load(done, true)
    },
    remove (id) {
      this.tryCatch(async () => {
        await this.DELETE_DOCUMENT({
          collection: this.collection,
          id,
          index: this.index
        })
        this.$emit('removeOK', id)
      }, error => {
        this.$emit('removeError', { id, error })
        throw error
      })
    }
  }
}
</script>

<style>
</style>
