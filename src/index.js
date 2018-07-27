import { shallowEqual, frag, iter, raf, snakeCase } from './utils'
import { MIN_INT } from './bithax'

const attachComponent = el => {
  const IMPL = Object.create({
    didMount: function() {
      iter([this._events, this._vars, this._attrs], fn => fn.apply(this, arguments))
    },

    didUpdate: function() {
      iter([this._frags, this._vars, this._attrs], fn => fn.apply(this, arguments))
    },

    _events: function() {
      iter(IMPL.events, ({ type, events }) =>
        el.addEventListener(type, e =>
          iter(events, ({ selector, handle }) => {
            let target = e.target

            if (target.nodeType === 3) {
              target = target.parentElement
            }

            if (target.matches(selector)) {
              try {
                raf(() => handle.call(IMPL, e)(IMPL.props))
              } catch (e) {
                console.error(e)
              }

              return -1
            }
          })
        )
      )
    },

    _frags: function() {
      iter(this.$frags, fragment => {
        const { adjSelector } = fragment
        const $sibling = el.querySelector(adjSelector)

        if (!$sibling) {
          return -1
        }

        const { $frag, assert } = fragment

        assert
          .apply(this, arguments)
          .then(() => raf(() => $sibling.parentNode.insertBefore($frag.cloneNode(true), $sibling.nextSibling)))
          .catch(kill => kill && raf(() => $sibling.parentNode.removeChild($sibling.nextSibling)))
      })

      return this
    },

    _vars: function(props) {
      iter(this.$propVars, propVar => {
        const { prop, selector } = propVar
        const $foundVars = el.querySelectorAll(selector)

        if (!($foundVars && prop in props)) {
          return -1
        }

        const $frag = document.createDocumentFragment()
        $frag.appendChild(document.createTextNode(props[prop]))

        iter($foundVars, $var => {
          if ($var.hasAttribute('value') || $var.hasAttribute('contenteditable')) {
            delete $var.dataset.key
          }

          raf(() => $var.replaceChild($frag.cloneNode(true), $var.childNodes[0]))
        })
      })
    },

    _attrs: function() {
      const atts = this.attrs

      iter(Object.keys(atts), key => {
        let nv = atts[key]
        const ov = el.getAttribute(key)

        if (key === 'style' && typeof nv === 'object') {
          const keys = Object.keys(nv)
          const values = Object.values(nv)

          nv = keys.reduce((acc, id, idx) => {
            acc += `${snakeCase(id)}: ${values[idx]};`
            return acc
          }, '')
        }

        if (!shallowEqual(nv, ov)) {
          el.setAttribute(key, nv)
        }
      })
    }
  })

  Object.defineProperty(IMPL, 'props', {
    writable: true,
    value: new Proxy(
      {
        title: 'Hello',
        count: 0,
        toggled: 0
      },
      {
        set: (props, prop, nv) => {
          const oldProps = Object.assign({}, props)
          const ov = oldProps[prop]

          if (!shallowEqual(ov, nv)) {
            props[prop] = nv
            IMPL.didUpdate.call(IMPL, props, oldProps)
          }

          return 1
        }
      }
    )
  })

  Object.defineProperty(IMPL, 'attrs', {
    get: function() {
      const { count, toggled } = this.props

      return {
        style: {
          background: toggled ? '#f36' : '#fafafa',
          transition: '.3s ease-in-out'
        }
      }
    }
  })

  Object.defineProperty(IMPL, 'events', {
    value: [
      {
        type: 'mousedown',
        events: [
          {
            selector: '[data-key="0.0"]',
            handle: function() {
              return ({ count, toggled }) => (this.props.toggled ^= 1)
            }
          },
          {
            selector: '[data-key="0.2"]',
            handle: function() {
              return ({ count, toggled }) => (this.props.count += 1)
            }
          },
          {
            selector: '[data-key="0.3"]',
            handle: function() {
              return () => raf(() => el.parentNode.removeChild(el))
            }
          }
        ]
      },
      {
        type: 'DOMCharacterDataModified',
        events: [
          {
            selector: '[contenteditable]',
            handle: function(e) {
              return ({ title }) => (this.props.title = e.newValue)
            }
          }
        ]
      }
    ]
  })

  Object.defineProperty(IMPL, '$frags', {
    value: [
      {
        $frag: frag('<div>toggled</div>'),
        adjSelector: '[data-key="0.0"]',
        assert: ({ toggled }, oldProps) => {
          const diff = !shallowEqual(toggled, oldProps.toggled)
          return new Promise((y, n) => (toggled && diff ? y() : n(diff)))
        }
      }
    ]
  })

  Object.defineProperty(IMPL, '$propVars', {
    value: [
      {
        prop: 'count',
        selector: '[data-key="0.1"]'
      },
      {
        prop: 'title',
        selector: '[data-key="0.4"]'
      }
    ]
  })

  raf(() => IMPL.didMount.call(IMPL, Object.assign({}, IMPL.props)), false)
}

const attachNodes = nodes =>
  iter(nodes, node => {
    switch (node.nodeType) {
      case 1:
        let children = []

        if (node.classList.contains('gc')) {
          attachComponent(node)
        } else if ((children = node.getElementsByClassName('gc'))) {
          attachNodes([].slice.call(children))
        }

        break
    }
  })

const $header = document.querySelector('header')
const $count = $header.querySelector('span')
const $app = document.getElementById('app')
const $nodes = document.getElementsByClassName('gc')
const $tmp = $nodes[0].cloneNode(true)

attachNodes([].slice.call($nodes))

// ----------------------------------------------

new MutationObserver(mutations => {
  iter(mutations, mut => {
    if (mut.type === 'childList') {
      const nodes = [].slice.call(mut.addedNodes).filter(n => n.nodeType === 1)

      if (nodes.length) {
        attachNodes(nodes)
      }

      raf(() => {
        const $frag = document.createDocumentFragment()
        $frag.appendChild(document.createTextNode($nodes.length))
        $count.children[0].replaceChild($frag, $count.children[0].childNodes[0])
      })
    }
  })
}).observe($app, { childList: true, subtree: true })

// ----------------------------------------------

let stm
window.addEventListener('scroll', () =>
  raf(() => {
    document.body.style.pointerEvents = 'none'

    clearTimeout(stm)
    stm = setTimeout(() => (document.body.style.pointerEvents = ''), 350)
  })
)

const $add = $header.children[0]
const $remove = $add.nextElementSibling

document.body.addEventListener('mousedown', ({ target }) => {
  if (target === $add || target === $remove) {
    const num = target.dataset.num | 0

    if (target === $add) {
      const $frag = document.createDocumentFragment()
      const $div = $tmp.cloneNode(true)
      $div.classList.add('cloned')

      iter([...Array(num | 0)], () => $frag.appendChild($div.cloneNode(true)))
      raf(() => $app.appendChild($frag.cloneNode(true)))
    } else {
      for (let i = 0, l = MIN_INT(num, $app.children.length); i < l; i++) {
        raf(() => $app.removeChild($app.lastChild), false)
      }
    }
  }
})

// ----------------------------------------------

document.querySelector('textarea').addEventListener('focus', ({ currentTarget }) => {
  const $note = currentTarget.nextElementSibling

  currentTarget.select()
  new Promise(resolve => {
    resolve(document.execCommand.call(document, 'Copy'))
  }).then(() => ($note.innerHTML = 'Copied!'))

  currentTarget.addEventListener('blur', () => ($note.innerHTML = '&nbsp;'), { once: true })
})
