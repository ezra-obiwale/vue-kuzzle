<template>
  <div>
    <slot :document="document" :working="working" />
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'KuzzleDocumentComponent',
  props: {
    collection: {
      type: String,
      required: true
    },
    defaultData: {
      type: Object,
      default: () => ({})
    },
    documentId: {
      type: String,
      default: ''
    },
    index: {
      type: String
    }
  },
  data () {
    return {
      document: {},
      working: false
    }
  },
  computed: {
    ...mapGetters('kuzzle', ['currentDocument'])
  },
  watch: {
    currentDocument (value) {
      if (value) {
        this.$set(this, 'document', value)
      }
    },
    working (value) {
      this.$emit('working', value)
    }
  },
  created () {
    this.$set(this, 'document', this.defaultData)
    if (this.documentId) {
      this.working = true
      this.tryCatch(async () => {
        await this.FETCH_A_DOCUMENT({
          index: this.index,
          collection: this.collection,
          id: this.documentId
        })
        this.working = false
      }, (error) => {
        this.working = false
        this.$emit('fetchError', error)
      })
    }
  },
  methods: {
    ...mapActions('kuzzle', ['FETCH_A_DOCUMENT', 'SAVE_DOCUMENT', 'DELETE_DOCUMENT']),
    remove () {
      if (!this.documentId) {
        return
      }

      this.tryCatch(async () => {
        await this.DELETE_DOCUMENT({
          collection: this.collection,
          id: this.documentId,
          index: this.index
        })
        this.$emit('removeOK', this.document)
      }, error => {
        this.$emit('removeError', { document: this.document, error })
        throw error
      })
    },
    save () {
      this.working = true
      this.tryCatch(async () => {
        const document = await this.SAVE_DOCUMENT({
          collection: this.collection,
          index: this.index,
          document: this.document,
          id: this.documentId
        })
        this.$emit('saveOK', document)
        this.working = false
      }, (error) => {
        this.$emit('saveError', error)
        this.working = false
      })
    }
  }
}
</script>

<style>
</style>
