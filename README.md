# tree-sitter-rsx

Tree-sitter grammar for the bodies of Dioxus `rsx!` macros, meant to be injected into the
macro's token tree. It extends [tree-sitter-rust](https://github.com/tree-sitter/tree-sitter-rust),
so attribute values, closures, conditions and `{expr}` blocks parse as Rust.

## Development

```sh
npm install --ignore-scripts
tree-sitter generate
tree-sitter test
```
