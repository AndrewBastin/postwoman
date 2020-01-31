<template>
  <div class="editor-wrapper">
    <div ref="editor">
    </div>
  </div>
</template>

<style>
.editor-wrapper {
  display: grid;
  width: 100%;
}
.CodeMirror {
  margin: 4px;
  border-radius:8px;
  transition: all 0.2s ease-in-out;
  resize: vertical;
  width: calc(100% - 8px);
  max-width: calc(100% - 8px);

  text-overflow: ellipsis;
  font-family: "Roboto Mono", monospace;
  font-weight: 400;
  font-size: 16px;
}
</style>

<script>
import Codemirror from "codemirror";

import "codemirror/lib/codemirror.css";
import "codemirror/theme/twilight.css";
import "codemirror/addon/fold/foldgutter.css";

import "codemirror/addon/fold/foldgutter";
import "codemirror/addon/fold/brace-fold";
import "codemirror/addon/fold/comment-fold";
import "codemirror/addon/fold/indent-fold";

import "codemirror/mode/javascript/javascript";

const DEFAULT_THEME = "twilight";

export default {
  props: {
    value: {
      type: String,
      default: ""
    },
    mode: {
      type: Object,
      default: () => {
        return {
          name: "javascript",
          json: true
        }
      }
    }
  },
  
  watch: {
    value(value) {
      if (value !== this.cacheValue) {
        this.editor.setValue(value);
        this.cacheValue = value;
      }
    },
    mode(value) {
      this.editor.setOption("mode", mode);
    }
  },

  data() {
    return {
      editor: null,
      cacheValue: ""
    }
  },

  mounted() {
    console.log(Codemirror.modes);
    this.editor = Codemirror(this.$refs.editor, {
      value: this.value,
      mode: this.mode,
      lineNumbers: true,
      inputStyle: "textarea",
      foldGutter: true,
      theme: DEFAULT_THEME,
      gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
    });
    this.editor.on("change", (instance) => {
      const val = instance.doc.getValue();
      this.cacheValue = val;
      this.$emit("input", val);
    });
  }
}
</script>
