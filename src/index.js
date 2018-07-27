import { shallowEqual, frag, iter, raf, snakeCase } from './utils'

const attachComponent = (el, ...args) => {
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

  raf(() => IMPL.didMount.call(IMPL, Object.assign({}, IMPL.props)))
}

window.onload = () => {
  const $nodes = document.getElementsByTagName('div')
  const $tmp = $nodes[0].cloneNode(true)

  iter($nodes, el => attachComponent(el))

  let btm
  document.body.children[0].addEventListener('click', () => {
    const $frag = document.createDocumentFragment()
    const $div = $tmp.cloneNode(true)
    $div.classList.add('cloned')

    iter([...Array(100)], () => $frag.appendChild($div.cloneNode(true)))
    raf(() => document.body.appendChild($frag.cloneNode(true)))
  })

  // --

  new MutationObserver(mutations => {
    iter(mutations, mut => {
      if (mut.type === 'childList') {
        iter(mut.addedNodes, node => {
          if (node.tagName === 'DIV') {
            attachComponent(node)
          }
        })
      }
    })
  }).observe(document.body, { childList: true })

  let stm, tick
  window.addEventListener('scroll', () => {
    if (!tick) {
      raf(() => {
        clearTimeout(stm)
        tick = false

        document.body.style.pointerEvents = 'none'
        stm = setTimeout(() => (document.body.style.pointerEvents = ''), 350)
      })

      tick = true
    }
  })
}
