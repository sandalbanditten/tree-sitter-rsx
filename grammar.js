/**
 * @file Dioxus rsx! macro bodies, on top of tree-sitter-rust
 * @license MIT
 */

const rust = require('tree-sitter-rust/grammar');

// Follows dioxus-rsx's `RsxBlock::parse_inner` and `BodyNode::parse`.
module.exports = grammar(rust, {
  name: 'rsx',

  conflicts: ($, original) => original.concat([
    [$.element_path, $.scoped_identifier, $.scoped_type_identifier_in_expression_position],
    [$.element_path, $.scoped_identifier],
  ]),

  rules: {
    // The macro's `{ ... }` token tree, as injected by the host Rust.
    // `shebang` only keeps Rust's inherited queries valid.
    source_file: $ => seq(
      optional($.shebang),
      choice(
        seq('{', repeat($._item), '}'),
        seq('(', repeat($._item), ')'),
        seq('[', repeat($._item), ']'),
      ),
    ),

    _item: $ => choice(
      $.rsx_attribute,
      alias($.rsx_spread, $.base_field_initializer),
      $._node,
      ',',
    ),

    _node: $ => choice(
      $.element,
      $.string_literal,
      $.raw_string_literal,
      $.block,
      $.match_expression,
      alias($.rsx_if, $.if_expression),
      alias($.rsx_for, $.for_expression),
    ),

    // Elements and components alike: dioxus tells them apart by name.
    element: $ => seq(
      field('name', choice(
        $.identifier,
        $.custom_element_name,
        alias($.element_path, $.scoped_identifier),
        alias($.element_turbofish, $.generic_type_with_turbofish),
        alias($.element_generic, $.generic_type),
      )),
      field('body', $.element_body),
    ),

    custom_element_name: $ => seq($.identifier, repeat1(seq('-', $.identifier))),

    // No leading `::`: after an expression, that would continue its path.
    element_path: $ => seq(
      field('path', choice(
        $.identifier,
        $.crate,
        $.self,
        $.super,
        alias($.element_path, $.scoped_identifier),
      )),
      '::',
      field('name', $.identifier),
    ),

    element_turbofish: $ => seq(
      field('type', choice($.identifier, alias($.element_path, $.scoped_identifier))),
      '::',
      field('type_arguments', $.type_arguments),
    ),

    element_generic: $ => seq(
      field('type', choice($.identifier, alias($.element_path, $.scoped_identifier))),
      field('type_arguments', $.type_arguments),
    ),

    element_body: $ => seq('{', repeat($._item), '}'),

    // Not `attribute`: that is Rust's `#[...]`.
    rsx_attribute: $ => choice(
      seq(
        field('name', choice($.identifier, $.string_literal)),
        ':',
        field('value', choice($._expression, alias($.attribute_struct, $.struct_expression))),
      ),
      // `{ id }` is `id: id`
      prec(-1, field('name', $.identifier)),
    ),

    rsx_spread: $ => seq('..', choice($._expression, alias($.attribute_struct, $.struct_expression))),

    // syn reads `to: Route::Post { id }` as a struct literal, where Rust's
    // condition rules would end the value before a `{` child.
    attribute_struct: $ => prec(1, prec.dynamic(1, seq(
      field('name', choice(
        alias($.identifier, $.type_identifier),
        alias($.element_path, $.scoped_type_identifier),
      )),
      field('body', $.field_initializer_list),
    ))),

    rsx_if: $ => prec.right(seq(
      'if',
      field('condition', $._condition),
      field('consequence', $.element_body),
      optional(field('alternative', alias($.rsx_else, $.else_clause))),
    )),

    rsx_else: $ => seq(
      'else',
      choice($.element_body, alias($.rsx_if, $.if_expression)),
    ),

    rsx_for: $ => seq(
      'for',
      field('pattern', $._pattern),
      'in',
      field('value', $._expression),
      field('body', $.element_body),
    ),
  },
});
